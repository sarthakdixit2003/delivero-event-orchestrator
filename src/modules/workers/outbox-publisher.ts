import pool from '@/db-utils/db.js';
import eventsQueue from '../queue/events.queue.js';
import logger from '@/logger/logger.js';

const worker_id = `outbox-publisher-${process.pid}`;

async function publishOutbox() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(`
      SELECT * FROM event_outbox
      WHERE scheduled_at <= now()
        AND status = 'PENDING'
        AND task_type = 'TRANSFORM'
      LIMIT 10  
      FOR UPDATE SKIP LOCKED
    `);

    const jobs = res.rows;

    for (const job of jobs) {
      eventsQueue.add('process-event', job, {
        jobId: `EVENT-${job.id}`,
        attempts: job.max_retries,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      await client.query(
        `
          UPDATE event_outbox
          SET status = 'QUEUED',
            updated_at = now()
          WHERE id = $1
        `,
        [job.id],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    logger.error(`Error publishing outbox in worker ${worker_id}: ${error}`);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function startPublisher() {
  logger.info('Outbox publisher started');

  setInterval(async () => {
    try {
      await publishOutbox();
    } catch (err) {
      console.error('Publisher error:', err);
    }
  }, 10000); // every 10 sec
}

export default startPublisher;

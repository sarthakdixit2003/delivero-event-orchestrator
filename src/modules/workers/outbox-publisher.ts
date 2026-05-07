import pool from '@/db-utils/db.js';
import eventsQueue from '../queue/events.queue.js';
import logger from '@/logger/logger.js';
import type { PoolClient } from 'pg';
import { InternalServerError } from '@/errors/index.js';

const worker_id = `outbox-publisher-${process.pid}`;

async function transformJobHandler(client: PoolClient) {
  try {
    const res = await client.query(`
      SELECT * FROM event_outbox
      WHERE scheduled_at <= now()
        AND status = 'PENDING'
        AND task_type = 'TRANSFORM'
      ORDER BY scheduled_at ASC
      LIMIT 10  
      FOR UPDATE SKIP LOCKED
    `);

    const jobs = res.rows;

    for (const job of jobs) {
      eventsQueue.add(
        'process-event',
        {
          ...job,
          outbox_id: job.id,
        },
        {
          jobId: `EVENT-${job.id}`,
          attempts: job.max_retries,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

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
  } catch (error: any) {
    logger.error(`Error publishing outbox in worker ${worker_id}: ${error.message}`);
    throw new InternalServerError(`Error publishing outbox in worker ${worker_id}: ${error.message}`);
  }
}

async function deliverJobHandler(client: PoolClient) {
  try {
    const res = await client.query(`
      SELECT eo.event_id as "event_id", eo.rule_id as "rule_id", eo.rule_version_number as "rule_version_number", eo.transformed_payload as "transformed_payload", eo.task_type as "task_type", eo.status as "status", s.concurrency_limit, s.endpoint_url, s.max_retries_allowed as "max_retries", s.rate_limit_rps 
      FROM event_outbox eo
      JOIN subscription s
      ON s.id = eo.subscription_id
      WHERE eo.scheduled_at <= now()
        AND eo.status = 'PENDING'
        AND eo.task_type = 'DELIVER'
        AND s.enabled = true
        AND s.deleted_at is null
      ORDER BY scheduled_at ASC
      LIMIT 10; 
      FOR UPDATE SKIP LOCKED
    `);

    const jobs = res.rows;
    for (const job of jobs) {
      eventsQueue.add(
        'process-event',
        {
          ...job,
          outbox_id: job.id,
        },
        {
          jobId: `EVENT-${job.id}`,
          attempts: job.max_retries,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    }
  } catch (error: any) {
    logger.error(`Error publishing outbox in worker ${worker_id}: ${error.message}`);
    throw new InternalServerError(`Error publishing outbox in worker ${worker_id}: ${error.message}`);
  }
}

async function publishOutbox() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await transformJobHandler(client);
    await deliverJobHandler(client);

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

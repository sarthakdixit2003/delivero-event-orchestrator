import pool from '@/db-utils/db.js';
import { InternalServerError } from '@/errors/internal.error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { Job, Worker } from 'bullmq';

const eventsWorker = new Worker('events', async (job: Job) => {
  const client = await pool.connect();
  try {
    if (!job.data?.event_id) {
      throw new NotFoundError(`Event id is required`);
    }
    const event_id = job.data.event_id;
    const query = `
      SELECT * from events
      where id = $1 and deleted_at is null
    `;
    const events = await client.query(query, [event_id]);
    if (events?.rows?.length < 1) {
      throw new NotFoundError(`Event ${event_id} not found`);
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new InternalServerError('Failed to process event');
  } finally {
    client.release();
  }
});

eventsWorker.run();

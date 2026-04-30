import pool from '@/db-utils/db.js';
import { InternalServerError } from '@/errors/internal.error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { ValidationError } from '@/errors/validation.error.js';
import axios from 'axios';
import { Job, Worker } from 'bullmq';
import type { PoolClient } from 'pg';

const eventHandlers = (task_type: string) => {
  switch (task_type) {
    case 'TRANSFORM':
      return transformEventHandler;
    default:
      throw new ValidationError(`Invalid task type: ${task_type}`);
  }
};

const eventsWorker = new Worker('events', async (job: Job) => {
  const client = await pool.connect();
  try {
    const { event_id, task_type, outbox_id } = job.data;
    if (!event_id) {
      throw new NotFoundError(`Event not found for outbox id: ${outbox_id}`);
    }
    const handler = eventHandlers(task_type);
    await handler(event_id, client);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new InternalServerError('Failed to process event');
  } finally {
    client.release();
  }
});

eventsWorker.run();

async function transformEventHandler(event_id: string, client: PoolClient) {
  try {
    await client.query('BEGIN');
    const eventQuery = `
        SELECT * from events
        where id = $1 and deleted_at is null
      `;
    const events = await client.query(eventQuery, [event_id]);
    if (events?.rows?.length < 1) {
      throw new NotFoundError(`Event ${event_id} not found`);
    }

    await client.query(
      `
        UPDATE event_outbox
        SET status = $1, picked_at = now(), updated_at = now(), worker_id = $2
      `,
      ['PROCESSING', 'worker_1'],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof NotFoundError) throw error;
    throw new InternalServerError(`Failed to transform event: ${event_id}`);
  } finally {
    client.release();
  }
}

import pool from '@/db-utils/db.js';
import { InternalServerError } from '@/errors/internal.error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { ValidationError } from '@/errors/validation.error.js';
import { Job, Worker } from 'bullmq';
import logger from '@/logger/logger.js';
import { env } from '@/config/env.js';
import { transformEventHandler } from './handlers/transform.handler.js';
import { deliverEventHandler } from './handlers/deliver.handler.js';

const worker_id = `events-worker-${process.pid}`;

const redisConnection = {
  host: env.REDIS_HOST,
  port: Number(env.REDIS_PORT),
  maxRetriesPerRequest: null,
};

const eventHandlers = (task_type: string) => {
  switch (task_type) {
    case 'TRANSFORM':
      return transformEventHandler;
    case 'DELIVER':
      return deliverEventHandler;
    default:
      throw new ValidationError(`Invalid task type: ${task_type}`);
  }
};

export const eventsWorker = new Worker(
  'events',
  async (job: Job) => {
    const client = await pool.connect();
    try {
      const { event_id, tenant_id, subscription_id, task_type, outbox_id } = job.data;
      if (!event_id) {
        throw new NotFoundError(`Event not found for outbox id: ${outbox_id}`);
      }
      logger.info(`Processing event ${event_id} in worker ${worker_id} with outbox id: ${outbox_id}`);
      const handler = eventHandlers(task_type);
      await handler(event_id, tenant_id, subscription_id, outbox_id, client, worker_id);
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
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

eventsWorker.on('failed', async (job) => {
  if (!job) return;
  if (job.attemptsMade >= (job.opts?.attempts ?? 0)) {
    logger.error(
      `Event ${job.data.event_id} failed in worker ${worker_id} after ${job.attemptsMade} attempts: ${job.failedReason}`,
    );
    const client = await pool.connect();

    try {
      await client.query(
        `UPDATE event_outbox
         SET status = 'FAILED',
             updated_at = now()
         WHERE id = $1`,
        [job.data.outbox_id],
      );
    } catch (error) {
      logger.error(`Error updating event outbox in worker ${worker_id}: ${error}`);
    } finally {
      client.release();
    }
  }
});

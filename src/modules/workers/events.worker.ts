import pool from '@/db-utils/db.js';
import { InternalServerError } from '@/errors/internal.error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { ValidationError } from '@/errors/validation.error.js';
import { Job, Worker } from 'bullmq';
import logger from '@/logger/logger.js';
import { env } from '@/config/env.js';
import { transformEventHandler } from './handlers/transform.handler.js';
import { deliverEventHandler } from './handlers/deliver.handler.js';
import { eventsDlq, queueJobsCompleted, queueJobsFailed } from '@/metrics/registry.js';

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
      const jobData = job.data;
      if (!jobData?.event_id) {
        throw new NotFoundError(`Event not found for outbox id: ${jobData?.outbox_id}`);
      }
      logger.info(`Processing event ${jobData?.event_id} in worker ${worker_id} with outbox id: ${jobData?.outbox_id}`);
      const handler = eventHandlers(jobData?.task_type);
      await handler(job, client, worker_id);
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

eventsWorker.on('completed', (job) => {
  queueJobsCompleted.inc();
});

eventsWorker.on('failed', async (job) => {
  queueJobsFailed.inc();
  if (!job) return;
  if (job.attemptsMade >= (job.opts?.attempts ?? 0)) {
    if (job.data?.task_type === 'TRANSFORM') {
      const jobData = job.data;
      logger.error(
        `EVENTS WORKER: Event ${jobData?.event_id} failed in worker ${worker_id} after ${job.attemptsMade} attempts: ${job.failedReason}`,
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
        logger.error(`EVENTS WORKER: Error updating event outbox in worker ${worker_id}: ${error}`);
      } finally {
        client.release();
      }
    } else if (job.data?.task_type === 'DELIVER') {
      eventsDlq.inc();
      const jobData = job.data;
      logger.error(
        `EVENTS WORKER: Event ${jobData?.event_id} failed in worker ${worker_id} after ${job.attemptsMade} attempts: ${job.failedReason}`,
      );
      const client = await pool.connect();

      try {
        const outbox_id = jobData?.outbox_id;
        const event_id = jobData?.event_id;
        const tenant_id = jobData?.tenant_id;
        const subscription_id = jobData?.subscription_id;
        const rule_id = jobData?.rule_id;
        const rule_version_number = jobData?.rule_version_number;
        const transformed_payload = jobData?.transformed_payload;

        await client.query('BEGIN');
        await client.query(
          `
        UPDATE event_outbox
        SET status = 'FAILED', updated_at = now()
        WHERE id = $1
      `,
          [outbox_id],
        );
        await client.query(
          `
        INSERT INTO event_outbox (event_id, tenant_id, subscription_id, rule_id, rule_version_number, source_outbox_id, transformed_payload, task_type)  
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
          [event_id, tenant_id, subscription_id, rule_id, rule_version_number, outbox_id, transformed_payload, 'DLQ'],
        );
        await client.query('COMMIT');
      } catch (error) {
        logger.error(`EVENTS WORKER: Error updating event outbox in worker ${worker_id}: ${error}`);
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }
});

import { NotFoundError, InternalServerError } from '@/errors/index.js';
import logger from '@/logger/logger.js';
import redisClient from '@/redis/redis-client.js';
import axios from 'axios';
import type { Job } from 'bullmq';
import type { PoolClient } from 'pg';
import crypto from 'crypto';
import { eventE2eLatency, eventsDelivered } from '@/metrics/registry.js';

export async function deliverEventHandler(job: Job, client: PoolClient, worker_id: string) {
  const {
    event_id,
    subscription_id,
    concurrency_limit,
    rule_id,
    rule_version_number,
    outbox_id,
    rate_limit_rps,
    endpoint_url,
    transformed_payload,
  } = job.data;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Event-Id': event_id,
  };
  const requestBody = transformed_payload;

  const lockKey = `concurrency:${subscription_id}`;
  const rateKey = `rate:${subscription_id}`;

  let concurrencyAcquired = false;

  let started_at: Date | null = null;
  let finished_at: Date | null = null;
  try {
    // Concurrency control
    const concurrencyCount = await redisClient.incr(lockKey);
    concurrencyAcquired = true;
    if (concurrencyCount === 1) {
      await redisClient.expire(lockKey, 30);
    }

    if (concurrencyCount > concurrency_limit) {
      await client.query(
        `
        UPDATE event_outbox
        SET status = $1, scheduled_at = now() + interval '1 second', updated_at = now()
        WHERE id = $2 AND status = $3
      `,
        ['PENDING', outbox_id, 'QUEUED'],
      );
      return;
    }

    // Rate limiting control
    const rateCount = await redisClient.incr(rateKey);
    if (rateCount === 1) {
      await redisClient.expire(rateKey, 1);
    }
    if (rate_limit_rps > 0 && rateCount > rate_limit_rps) {
      await client.query(
        `
        UPDATE event_outbox
        SET status = $1, scheduled_at = now() + interval '1 second', updated_at = now()
        WHERE id = $2 AND status = $3
      `,
        ['PENDING', outbox_id, 'QUEUED'],
      );
      return;
    }
    await client.query('BEGIN');
    await client.query(
      `
      UPDATE event_outbox
      SET status = $1, picked_at = now(), worker_id = $2, updated_at = now()
      WHERE id = $3 AND status = $4
    `,
      ['PROCESSING', worker_id, outbox_id, 'QUEUED'],
    );
    const res_idem_key_auth = await client.query(
      `
      SELECT seo.created_at as "ingested_at" ,e.idempotency_key as "idempotency_key", s.auth_type as "auth_type", s.auth_secret_ref as "auth_secret_ref"
      FROM events e 
      JOIN subscription s
      ON s.id = $1
      JOIN event_outbox seo
      ON seo.source_outbox_id = $2
      WHERE e.id = $3 and e.deleted_at is null
    `,
      [subscription_id, outbox_id, event_id],
    );
    await client.query('COMMIT');
    const { ingested_at, idempotency_key, auth_type, auth_secret_ref } = res_idem_key_auth.rows[0];
    if (!idempotency_key) {
      throw new NotFoundError(`Idempotency key not found for event ${event_id}`);
    }
    if (auth_type === 'hmac') {
      const rawBody = JSON.stringify(requestBody);
      const signature = crypto.createHmac('sha256', auth_secret_ref).update(rawBody).digest('hex');
      requestHeaders['X-Signature'] = signature;
      requestHeaders['X-Idempotency-Key'] = idempotency_key;
    }
    started_at = new Date();
    // Call webhook with transformed payload
    const res = await axios.post(endpoint_url, requestBody, {
      headers: requestHeaders,
      timeout: 10000,
    });
    finished_at = new Date();
    eventE2eLatency.observe(Number(finished_at) - Number(ingested_at));
    eventsDelivered.inc({ status_code: String(res?.status ?? 0) });
    await client.query('BEGIN');
    await insertDeliveryAttempt(
      client,
      event_id,
      subscription_id,
      rule_id,
      rule_version_number,
      job.attemptsMade + 1,
      transformed_payload,
      requestHeaders ?? {},
      requestBody ?? {},
      res?.status ?? 0,
      res?.headers ?? {},
      res?.data ?? {},
      worker_id,
      started_at,
      finished_at,
    );
    await client.query(
      `
        UPDATE event_outbox
        SET status = 'COMPLETED', updated_at = now()
        WHERE id = $1 AND status = $2
      `,
      [outbox_id, 'PROCESSING'],
    );
    await client.query('COMMIT');
  } catch (error: any) {
    logger.error({
      msg: `DELIVERY HANDLER`,
      message: error.message,
      stack: error.stack,
      detail: error.detail,
      code: error.code,
    });
    try {
      await client.query('ROLLBACK');
    } catch (error: any) {
      logger.error({
        msg: `DELIVERY HANDLER: Rollback failed`,
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
    }

    await client.query('BEGIN');
    // add delivery attempt log
    if (axios.isAxiosError(error)) {
      logger.error({
        msg: `DELIVERY HANDLER: Axios error`,
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      const res = error.response;
      finished_at = new Date();
      await insertDeliveryAttempt(
        client,
        event_id,
        subscription_id,
        rule_id,
        rule_version_number,
        job.attemptsMade + 1,
        transformed_payload,
        requestHeaders ?? {},
        requestBody ?? {},
        res?.status ?? 0,
        res?.headers ?? {},
        res?.data ?? {},
        worker_id,
        started_at,
        finished_at,
      );
    }

    await client.query(
      `
      UPDATE event_outbox
      SET retry_count = retry_count + 1, 
          error_message = $1,
          updated_at = now()
      WHERE id = $2
      `,
      [error.message, outbox_id],
    );
    await client.query('COMMIT');
    if (error instanceof NotFoundError) throw error;
    throw new InternalServerError(
      `DELIVERY HANDLER: Failed to deliver event in worker ${worker_id} with outbox id: ${outbox_id}: ${error.message}`,
    );
  } finally {
    if (concurrencyAcquired) {
      await redisClient.decr(lockKey);
    }
  }
}

async function insertDeliveryAttempt(
  client: PoolClient,
  event_id: string,
  subscription_id: string,
  rule_id: string,
  rule_version_number: number,
  attempt_number: number,
  transformed_payload: any,
  request_headers: any,
  request_body: any,
  response_code: number,
  response_headers: any,
  response_body: any,
  worker_id: string,
  started_at: Date | null,
  finished_at: Date | null,
) {
  const values = [
    event_id,
    subscription_id,
    rule_id,
    rule_version_number,
    attempt_number,
    safeJson(transformed_payload),
    safeJson(request_headers),
    safeJson(request_body),
    response_code,
    safeJson(response_headers),
    safeJson(response_body),
    worker_id,
  ];
  if (started_at) values.push(started_at);
  if (finished_at) values.push(finished_at);
  await client.query(
    `
    INSERT INTO delivery_attempt (event_id, subscription_id, rule_id, rule_version_number, attempt_number, transformed_payload, request_headers, request_body, response_code, response_headers, response_body, worker_id ${started_at ? ', started_at' : ''}${finished_at ? ', finished_at' : ''})
    VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')})
    RETURNING *;
  `,
    values,
  );
}

function safeJson(value: any) {
  if (value === undefined) return null;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { value };
  }

  return value;
}

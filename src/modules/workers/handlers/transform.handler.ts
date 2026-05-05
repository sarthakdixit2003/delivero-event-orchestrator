import type { PoolClient } from 'pg';
import { NotFoundError } from '@/errors/not-found.error.js';
import { InternalServerError } from '@/errors/internal.error.js';
import axios from 'axios';
import logger from '@/logger/logger.js';
import { env } from '@/config/env.js';

export async function transformEventHandler(
  event_id: string,
  tenant_id: string,
  subscription_id: string,
  outbox_id: string,
  client: PoolClient,
  worker_id: string,
) {
  try {
    await client.query('BEGIN');
    const query = `
        select e.id as "event_id", s.id as "subscription_id", s.rule_id, e.original_payload, rv.transform_template, rv.schema, rv.version_number
        from events e
        join subscription s
        on s.id = $1

        join rule_version rv
        on rv.rule_id = s.rule_id

        where e.id = $2 and rv.version_number = (
          select max(version_number)
          from rule_version
          where rule_id = s.rule_id
        );
      `;
    const res = await client.query(query, [subscription_id, event_id]);
    if (res?.rows?.length < 1) {
      throw new NotFoundError(`Event ${event_id} not found`);
    }

    await client.query(
      `
        UPDATE event_outbox
        SET status = $1, picked_at = now(), updated_at = now(), worker_id = $2
        WHERE id = $3 and status = $4
      `,
      ['PROCESSING', worker_id, outbox_id, 'QUEUED'],
    );

    await client.query('COMMIT');

    const {
      event_id: _event_id,
      subscription_id: _subscription_id,
      rule_id,
      original_payload,
      transform_template,
      schema,
      version_number,
    } = res.rows[0];

    const rule = { transform_template, validation_schema: schema };
    const response = await axios.post(`${env.TRANSFORM_API_BASE_URL}/transform`, { payload: original_payload, rule });

    logger.info(`Transformed payload for event ${event_id} in worker ${worker_id}: ${response.data}`);
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE event_outbox
        SET status = $1, updated_at = now()
        WHERE id = $2
      `,
      ['COMPLETED', outbox_id],
    );
    await client.query(
      `
      INSERT INTO event_outbox (event_id, tenant_id, subscription_id, rule_id, rule_version_number, source_outbox_id, transformed_payload, task_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [event_id, tenant_id, subscription_id, rule_id, version_number, outbox_id, response.data, 'DELIVER'],
    );
    await client.query('COMMIT');
  } catch (error: any) {
    logger.error(`Error transforming event in worker ${worker_id} with outbox id: ${outbox_id}: ${error.message}`);
    await client.query('ROLLBACK');
    await client.query(
      `UPDATE event_outbox
         SET retry_count = retry_count + 1,
             error_message = $1,
             updated_at = now()
         WHERE id = $2`,
      [error.message, outbox_id],
    );
    if (error instanceof NotFoundError) throw error;
    throw new InternalServerError(
      `Failed to transform event in worker ${worker_id} with outbox id: ${outbox_id}: ${error.message}`,
    );
  }
}

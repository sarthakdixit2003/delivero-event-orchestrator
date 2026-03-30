import type { Logger } from 'pino';
import pool from '@/db-utils/db.js';
import logger from '@/logger/logger.js';
import type { Pool, QueryResult } from 'pg';
import type { CreateEventDto } from './events.dto.js';
import { InternalServerError } from '@/errors/internal.error.js';
import { ConflictError } from '@/errors/conflict.error.js';
import { EventStatus, type Event } from './events.model.js';

export class EventsService {
  private logger: Logger;
  private pool: Pool;

  constructor() {
    this.logger = logger;
    this.pool = pool;
  }

  async createEvent(body: CreateEventDto): Promise<Event | undefined> {
    const client = await this.pool.connect();
    try {
      const receivedAt = new Date().toISOString();
      const eventStatus = EventStatus.NOT_STARTED;

      const query = `
        WITH inserted_event AS (
          INSERT INTO events (tenant_id, event_type, source, original_payload, received_at, status, idempotency_key)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        ),
        inserted_idempotency_key AS (
          INSERT INTO idempotency_key (tenant_id, event_id, idempotency_key)
          SELECT tenant_id, ie.id, idempotency_key
          FROM inserted_event ie
        ),
        inserted_event_outbox AS (
          INSERT INTO event_outbox (event_id, tenant_id, subscription_id, task_type)  
          SELECT ie.id, ie.tenant_id, s.id, 'TRANSFORM'
          FROM inserted_event ie
          LEFT JOIN subscription s 
            ON ie.tenant_id = s.tenant_id
            AND s.enabled = true
            AND s.deleted_at IS NULL
        )
        SELECT * FROM inserted_event
      `;
      const values = [
        body.tenant_id,
        body.event_type,
        body.source,
        body.original_payload,
        receivedAt,
        eventStatus,
        body.idempotency_key,
      ];

      // Add event and idempotency key to database
      const result: QueryResult<Event> = await client.query(query, values);
      const event = result.rows[0];

      if (!event) {
        throw new InternalServerError('Failed to create event');
      }

      return event;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new InternalServerError('Failed to create event');
    } finally {
      client.release();
    }
  }
}

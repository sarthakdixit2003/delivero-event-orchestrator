import type { Logger } from 'pino';
import pool from '../../db-utils/db.js';
import logger from '../../logger/logger.js';
import {
  IdempotencyKeyService,
  type IdempotencyKeyServiceInterface,
} from './idempotency-key/idempotency-key.service.js';
import type { Pool, QueryResult } from 'pg';
import type { CreateEventDto } from './events.dto.js';
import { InternalServerError } from '../../errors/internal.error.js';
import { ConflictError } from '../../errors/conflict.error.js';
import { EventStatus } from './events.model.js';

export class EventsService {
  private idempotencyKeyService: IdempotencyKeyServiceInterface;
  private logger: Logger;
  private pool: Pool;

  constructor() {
    this.idempotencyKeyService = new IdempotencyKeyService();
    this.logger = logger;
    this.pool = pool;
  }

  async createEvent(body: CreateEventDto): Promise<Event | undefined> {
    const client = await this.pool.connect();
    try {
      const receivedAt = new Date().toISOString();
      const eventStatus = EventStatus.NOT_STARTED;

      this.logger.info(`Checking idempotency key for tenant ${body.tenant_id}`);
      const idempotencyKey = await this.idempotencyKeyService.getIdempotencyKey(body.tenant_id);
      if (idempotencyKey) {
        throw new ConflictError('Duplicate event received');
      }
      this.logger.info(`Idempotency key not found for tenant ${body.tenant_id}, creating event`);

      const query = `
        WITH inserted_event AS (
          INSERT INTO events (tenant_id, event_type, source, original_payload, received_at, status, idempotency_key)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        ),
        inserted_idempotency_key AS (
          INSERT INTO idempotency_key (tenant_id, event_id, idempotency_key)
          SELECT tenant_id, inserted_event.id, idempotency_key
          FROM inserted_event
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
      const result: QueryResult<Event> = await client.query(query, values);
      return result.rows[0];
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

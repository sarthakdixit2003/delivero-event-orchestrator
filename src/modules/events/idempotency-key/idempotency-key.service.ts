import type { Pool, QueryResult } from 'pg';
import pool from '@/db-utils/db.js';
import type { Logger } from 'pino';
import logger from '@/logger/logger.js';
import type { CreateIdempotencyKeyDto } from './idempotency.dto.js';
import { InternalServerError } from '@/errors/internal.error.js';
import type { IdempotencyKey } from './idempotency-key.model.js';

export interface IdempotencyKeyServiceInterface {
  createIdempotencykey(body: CreateIdempotencyKeyDto): Promise<IdempotencyKey | undefined>;
  getIdempotencyKeys(tenantId: string): Promise<IdempotencyKey[] | null>;
  getByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<IdempotencyKey | null>;
  deleteIdempotencyKeyById(idempotencyKey: string): Promise<void>;
}

export class IdempotencyKeyService implements IdempotencyKeyServiceInterface {
  private pool: Pool;
  private logger: Logger;

  constructor() {
    this.pool = pool;
    this.logger = logger;
  }

  async createIdempotencykey(body: CreateIdempotencyKeyDto): Promise<IdempotencyKey | undefined> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO idempotency_key (tenant_id, event_id, idempotency_key)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const values = [body.tenant_id, body.event_id, body.idempotency_key];
      const result: QueryResult<IdempotencyKey> = await client.query(query, values);
      return result?.rows?.[0];
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError('Failed to create idempotency key');
    } finally {
      client.release();
    }
  }

  async getIdempotencyKeys(tenantId: string): Promise<IdempotencyKey[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM idempotency_key WHERE tenant_id = $1
      `;
      const values = [tenantId];
      const result: QueryResult<IdempotencyKey> = await client.query(query, values);

      return result.rows;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError(`Failed to get idempotency keys for tenant ${tenantId}`);
    } finally {
      client.release();
    }
  }

  async getByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<IdempotencyKey | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM idempotency_key WHERE tenant_id = $1 and idempotency_key = $2
      `;
      const values = [tenantId, idempotencyKey];
      const result: QueryResult<IdempotencyKey> = await client.query(query, values);
      return result?.rows?.[0] || null;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError(
        `Failed to get idempotency key for tenant ${tenantId} and idempotency key ${idempotencyKey}`,
      );
    } finally {
      client.release();
    }
  }

  async deleteIdempotencyKeyById(idempotencyKey: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        DELETE FROM idempotency_key WHERE idempotency_key = $1
      `;
      const values = [idempotencyKey];
      await client.query(query, values);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError('Failed to delete idempotency key');
    } finally {
      client.release();
    }
  }
}

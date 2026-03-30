import type { Pool, QueryResult } from 'pg';
import type { CreateTenantDto, UpdateTenantDto } from './tenants.dto.js';
import { InternalServerError, ValidationError } from '@/errors/index.js';
import type { Tenant } from './tenants.model.js';
import pool from '@/db-utils/db.js';
import logger from '@/logger/logger.js';
import type { Logger } from 'pino';

export class TenantsService {
  private pool: Pool;
  private logger: Logger;

  constructor() {
    this.pool = pool;
    this.logger = logger;
  }

  async getTenants(): Promise<Tenant[]> {
    const client = await this.pool.connect();
    try {
      const tenants: QueryResult<Tenant> = await client.query(`
          SELECT * FROM tenant
          WHERE deleted_at IS NULL and enabled = true
        `);
      return tenants.rows;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError(`Failed to get tenants: ${error}`);
    } finally {
      client.release();
    }
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    const client = await this.pool.connect();
    try {
      const tenant: QueryResult<Tenant> = await client.query(
        `
          SELECT * FROM tenant
          WHERE deleted_at IS NULL and enabled = true and id = $1
        `,
        [id],
      );
      return tenant?.rows?.[0] || null;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError('Failed to get tenant by id');
    } finally {
      client.release();
    }
  }

  async createTenant(body: CreateTenantDto): Promise<Tenant | undefined> {
    const client = await this.pool.connect();
    try {
      this.logger.info(`Creating tenant ${body.name}`);
      const result: QueryResult<Tenant> = await client.query(
        `
          INSERT INTO tenant (name)
          VALUES ($1)
          RETURNING *
        `,
        [body.name],
      );
      return result?.rows?.[0];
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError('Failed to create tenant', {
        body,
      });
    } finally {
      client.release();
    }
  }

  async deleteTenantById(id: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE tenant
        SET deleted_at = NOW(), enabled = false
        WHERE id = $1
      `,
        [id],
      );
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError(`Failed to delete tenant by id: ${error}`);
    } finally {
      client.release();
    }
  }

  async updateTenantById(id: string, body: UpdateTenantDto) {
    const client = await this.pool.connect();
    try {
      const fields = [];
      const values = [];
      let index = 1;

      if (body?.name !== undefined) {
        fields.push(`name = $${index}`);
        values.push(body?.name);
        index++;
      }
      if (body?.enabled !== undefined) {
        fields.push(`enabled = $${index}`);
        values.push(body?.enabled);
        index++;
      }

      if (fields.length === 0) {
        throw new ValidationError('At least one field is required');
      }

      values.push(id);

      const query = `
        UPDATE tenant
        SET ${fields.join(', ')}
        WHERE id = $${index}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result?.rows?.[0];
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError(`Failed to update tenant by id: ${error}`);
    } finally {
      client.release();
    }
  }
}

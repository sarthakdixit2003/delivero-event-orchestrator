import type { Pool, QueryResult } from 'pg';
import pool from '../../db-utils/db.js';
import { InternalServerError, NotFoundError } from '../../errors/index.js';
import type { Logger } from 'pino';
import logger from '../../logger/logger.js';
import type { Subscription } from './subscription.model.js';

export class SubscriptionService {
  private pool: Pool;
  private logger: Logger;

  constructor() {
    this.pool = pool;
    this.logger = logger;
  }

  async getSubscriptionsByTenantId(tenantId: string): Promise<Subscription[]> {
    const client = await this.pool.connect();
    try {
      const subscriptions: QueryResult<Subscription> = await client.query(
        `
        SELECT * FROM subscription
        WHERE deleted_at IS NULL and enabled = true and tenant_id = $1
      `,
        [tenantId],
      );
      return subscriptions.rows;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError('Failed to get subscriptions');
    } finally {
      client.release();
    }
  }

  async getSubscriptionById(id: string, tenantId: string): Promise<Subscription> {
    const client = await this.pool.connect();
    try {
      const subscription: QueryResult<Subscription> = await client.query(
        `SELECT * FROM subscription
        WHERE deleted_at IS NULL and enabled = true and id = $1 and tenant_id = $2`,
        [id, tenantId],
      );
      if (!subscription.rows[0]) {
        throw new NotFoundError('Subscription not found', { id });
      }
      return subscription.rows[0];
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError('Failed to get subscription');
    } finally {
      client.release();
    }
  }

  async createSubscription(subscription: Subscription): Promise<Subscription> {
    const client = await this.pool.connect();
    try {
      const fields = [];
      const placeholders = [];
      const values = [];
      let index = 1;
      if (subscription.name) {
        fields.push(`name`);
        values.push(subscription.name);
        placeholders.push(`$${index}`);
        index++;
      }
      if (subscription.auth_type) {
        fields.push(`auth_type`);
        values.push(subscription.auth_type);
        placeholders.push(`$${index}`);
        index++;
      }
      if (subscription.auth_secret_ref) {
        fields.push(`auth_secret_ref`);
        values.push(subscription.auth_secret_ref);
        placeholders.push(`$${index}`);
        index++;
      }
      if (subscription.max_retries_allowed) {
        fields.push(`max_retries_allowed`);
        values.push(subscription.max_retries_allowed);
        placeholders.push(`$${index}`);
        index++;
      }
      if (subscription.concurrency_limit) {
        fields.push(`concurrency_limit`);
        values.push(subscription.concurrency_limit);
        placeholders.push(`$${index}`);
        index++;
      }
      if (subscription.rate_limit_rps) {
        fields.push(`rate_limit_rps`);
        values.push(subscription.rate_limit_rps);
        placeholders.push(`$${index}`);
        index++;
      }
      if (subscription.enabled) {
        fields.push(`enabled`);
        values.push(subscription.enabled);
        placeholders.push(`$${index}`);
        index++;
      }
      if (subscription.endpoint_url) {
        fields.push(`endpoint_url`);
        values.push(subscription.endpoint_url);
        placeholders.push(`$${index}`);
        index++;
      }
      fields.push(`tenant_id`);
      values.push(subscription.tenant_id);
      placeholders.push(`$${index}`);
      index++;
      const query = `
        INSERT INTO subscription (${fields.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      const newSubscription: QueryResult<Subscription> = await client.query(query, values);
      if (!newSubscription.rows[0]) {
        throw new InternalServerError('Failed to create subscription');
      }
      return newSubscription.rows[0];
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError('Failed to create subscription', { subscription });
    } finally {
      client.release();
    }
  }

  async updateSubscriptionById(id: string, tenantId: string, subscription: Subscription): Promise<Subscription> {
    const client = await this.pool.connect();
    try {
      const fields = [];
      const values = [];
      let index = 1;
      if (subscription.name) {
        fields.push(`name = $${index}`);
        values.push(subscription.name);
        index++;
      }
      if (subscription.auth_type) {
        fields.push(`auth_type = $${index}`);
        values.push(subscription.auth_type);
        index++;
      }
      if (subscription.auth_secret_ref) {
        fields.push(`auth_secret_ref = $${index}`);
        values.push(subscription.auth_secret_ref);
        index++;
      }
      if (subscription.max_retries_allowed) {
        fields.push(`max_retries_allowed = $${index}`);
        values.push(subscription.max_retries_allowed);
        index++;
      }
      if (subscription.concurrency_limit) {
        fields.push(`concurrency_limit = $${index}`);
        values.push(subscription.concurrency_limit);
        index++;
      }
      if (subscription.rate_limit_rps) {
        fields.push(`rate_limit_rps = $${index}`);
        values.push(subscription.rate_limit_rps);
        index++;
      }
      if (subscription.enabled) {
        fields.push(`enabled = $${index}`);
        values.push(subscription.enabled);
        index++;
      }
      if (subscription.endpoint_url) {
        fields.push(`endpoint_url = $${index}`);
        values.push(subscription.endpoint_url);
        index++;
      }
      values.push(id, tenantId);
      const query = `
        UPDATE subscription 
        SET ${fields.join(', ')}
        WHERE id = $${index} and tenant_id = $${index + 1}
        RETURNING *
      `;

      const updatedSubscription: QueryResult<Subscription> = await client.query(query, values);

      if (!updatedSubscription.rows[0]) {
        throw new InternalServerError('Failed to update subscription');
      }
      return updatedSubscription.rows[0];
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError('Failed to update subscription', { subscription });
    } finally {
      client.release();
    }
  }

  async deleteSubscriptionById(id: string, tenantId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE subscription 
        SET deleted_at = NOW(), enabled = false 
        WHERE deleted_at IS NULL and enabled = true and id = $1 and tenant_id = $2
      `,
        [id, tenantId],
      );
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError('Failed to delete subscription', { id, tenantId });
    } finally {
      client.release();
    }
  }
}

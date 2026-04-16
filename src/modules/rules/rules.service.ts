import pool from '@/db-utils/db.js';
import logger from '@/logger/logger.js';
import type { Pool, QueryResult } from 'pg';
import type { Logger } from 'pino';
import type { CreateRuleDto, RulePayload, UpdateRuleDto } from './rules.dto.js';
import type { Rule, RuleVersion } from './rules.model.js';
import { InternalServerError } from '@/errors/internal.error.js';
import { ConflictError } from '@/errors/conflict.error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { ValidationError } from '@/errors/validation.error.js';

export class RulesService {
  private logger: Logger;
  private pool: Pool;

  constructor() {
    this.logger = logger;
    this.pool = pool;
  }

  async getRules(tenant_id: string, rule_id?: string): Promise<RulePayload | RulePayload[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT r.*, rv.version_number, rv.schema, rv.transform_template, rv.changes_summary
        FROM rules r
        JOIN (
          select rule_id, max(version_number) as max_version
          from rule_version
          group by rule_id
        ) latest
        ON r.id = latest.rule_id
        join rule_version rv
        on latest.rule_id = rv.rule_id and latest.max_version = rv.version_number
        WHERE r.tenant_id = $1 AND r.enabled = true AND r.deleted_at IS null ${rule_id ? `AND r.id = $2` : ''};
      `;
      const values: (string | number)[] = [tenant_id];
      if (rule_id) {
        values.push(Number(rule_id));
      }
      const rules: QueryResult<RulePayload> = await client.query(query, values);

      if (rule_id && rules.rows.length === 0) {
        throw new NotFoundError('Rule not found');
      }

      if (rule_id && rules.rows.length > 0) {
        return rules.rows[0] as RulePayload;
      }

      return rules.rows as RulePayload[];
    } catch (error) {
      this.logger.error(error);
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError(`Not able to fetch rules`);
    } finally {
      client.release();
    }
  }

  async createRule(body: CreateRuleDto): Promise<Rule> {
    // create rule -> create rule version with rule id FK
    const client = await this.pool.connect();
    try {
      const query = `
        WITH inserted_rule AS (
          INSERT INTO rules (tenant_id, name, description)
          VALUES ($1, $2, $3)
          RETURNING *
        ),
        inserted_rule_version AS (
          INSERT INTO rule_version (rule_id, schema, transform_template, changes_summary)
          SELECT ir.id, $4, $5, $6
          FROM inserted_rule ir
          RETURNING *
        )
        SELECT * FROM inserted_rule
      `;
      const values = [
        body.tenant_id,
        body.name,
        body.description,
        body.schema,
        body.transform_template,
        'Initial version',
      ];
      const result: QueryResult<Rule> = await client.query(query, values);
      const rule = result.rows[0];
      if (!rule) {
        throw new InternalServerError('Failed to create rule');
      }
      return rule;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new InternalServerError('Failed to create rule');
    } finally {
      client.release();
    }
  }

  async updateRule(tenant_id: string, rule_id: number, body: UpdateRuleDto): Promise<Partial<RulePayload> | undefined> {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    try {
      let fields = [];
      let values = [];
      let index = 1;
      if (body.name != null) {
        fields.push(`name=$${index++}`);
        values.push(body.name);
      }
      if (body.description != null) {
        fields.push(`description=$${index++}`);
        values.push(body.description);
      }
      if (body.enabled != null) {
        fields.push(`enabled=$${index++}`);
        values.push(body.enabled);
      }

      fields.push(`updated_at = NOW()`);

      values.push(tenant_id);
      values.push(rule_id);

      const query = `
        UPDATE rules 
        SET ${fields.join(', ')}
        WHERE tenant_id=$${index++} AND id=$${index++} AND deleted_at IS NULL
        RETURNING *
      `;

      const updatedRules: QueryResult<Rule> = await client.query(query, values);

      if (!updatedRules.rows[0]) throw new InternalServerError(`Failed to update Rule`);

      const { id: _id, tenant_id: _tenant_id, deleted_at: _deleted_at, ...cleanedRule } = updatedRules.rows[0];

      fields = [];
      values = [];
      index = 1;
      let insertNewVersion = false;

      if (body.schema != null) {
        fields.push(`$${index++}`);
        values.push(body.schema);
        insertNewVersion = true;
      } else {
        fields.push(`rv.schema`);
      }

      if (body.transform_template != null) {
        fields.push(`$${index++}`);
        values.push(body.transform_template);
        insertNewVersion = true;
      } else {
        fields.push(`rv.transform_template`);
      }

      if (body.changes_summary != null) {
        fields.push(`$${index++}`);
        values.push(body.changes_summary);
      } else {
        fields.push(`$${index++}`);
        values.push('No change summary provided');
      }

      if (!insertNewVersion) {
        return cleanedRule as Partial<RulePayload>;
      }

      values.push(rule_id);

      await client.query(
        `
          SELECT id FROM rules
          WHERE id = $1
          FOR UPDATE
        `,
        [rule_id],
      );

      const queryRuleVersion = `
        INSERT INTO rule_version (
          rule_id,
          version_number,
          schema,
          transform_template,
          changes_summary
        )
        SELECT
          $${index},
          COALESCE(MAX(version_number), 0) + 1,
          ${fields.join(', ')}
        FROM rule_version rv
        WHERE rule_id = $${index}
        RETURNING *;
      `;

      const updatedRuleVersion: QueryResult<RuleVersion> = await client.query(queryRuleVersion, values);

      if (!updatedRuleVersion.rows[0]) throw new InternalServerError(`Failed to update Rule Version`);

      const {
        id: _id2,
        rule_id: _rule_id2,
        created_at: _created_at2,
        version_number: _version_number2,
        ...cleanedRuleVersion2
      } = updatedRuleVersion.rows[0];

      await client.query('COMMIT');

      return { ...cleanedRule, ...cleanedRuleVersion2 } as Partial<RulePayload>;
    } catch (error) {
      logger.error(error);
      await client.query('ROLLBACK');
      if (error instanceof ValidationError) throw error;
      if (error instanceof InternalServerError) throw error;
      throw new InternalServerError('Failed to update rule');
    } finally {
      client.release();
    }
  }

  async deleteRule(tenant_id: string, rule_id: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
       UPDATE rules
       SET deleted_at = NOW(), enabled = $1
       WHERE id = $2 and tenant_id = $3
       RETURNING *
      `;
      const values = [false, rule_id, tenant_id];
      const deletedRules: QueryResult<Rule[]> = await client.query(query, values);

      if (!deletedRules.rows[0]) {
        throw new InternalServerError(`Not able to delete rule: ${rule_id}`);
      }
      return;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof InternalServerError) throw error;
      throw new InternalServerError('Failed to delete rule');
    } finally {
      client.release();
    }
  }
}

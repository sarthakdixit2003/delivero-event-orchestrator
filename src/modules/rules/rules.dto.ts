import type { JSONValue } from '../events/events.model.js';

export interface CreateRuleDto {
  tenant_id: string;
  name: string;
  description: string;
  schema: JSONValue;
  transform_template: JSONValue;
}

export interface RulePayload {
  id: number;
  tenant_id: string;
  name: string;
  description: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version_number: number;
  schema: JSONValue;
  transform_template: JSONValue;
  changes_summary: string;
}

export interface UpdateRuleDto {
  name?: string;
  description?: string;
  enabled?: boolean;
  schema?: JSONValue;
  transform_template?: JSONValue;
  changes_summary?: string;
}

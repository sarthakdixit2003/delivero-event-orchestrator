import type { JSONValue } from '../events/events.model.js';

export interface Rule {
  id: number;
  tenant_id: string;
  name: string;
  description: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RuleVersion {
  id: number;
  rule_id: number;
  version_number: number;
  schema: JSONValue;
  transform_template: JSONValue;
  changes_summary: string;
  created_at: string;
}

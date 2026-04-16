import type { AuthTypeEnum } from './subscription.dto.js';

export interface Subscription {
  id: string;
  tenant_id: string;
  rule_id: number | null;
  name: string;
  endpoint_url: string;
  auth_type: AuthTypeEnum;
  auth_secret_ref: string;
  max_retries_allowed: number;
  concurrency_limit: number;
  rate_limit_rps: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AuthTypeEnum {
  HMAC: 'hmac';
  BEARER: 'bearer';
}

export interface CreateSubscriptionDto {
  tenant_id: string;
  name: string;
  endpoint_url: string;
  auth_type: AuthTypeEnum;
  auth_secret_ref: string;
  max_retries_allowed?: number;
  concurrency_limit?: number;
  rate_limit_rps?: number;
  enabled?: boolean;
  rule_id?: number;
}

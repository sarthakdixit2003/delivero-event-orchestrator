export interface CreateIdempotencyKeyDto {
  tenant_id: string;
  event_id: string;
  idempotency_key: string;
}

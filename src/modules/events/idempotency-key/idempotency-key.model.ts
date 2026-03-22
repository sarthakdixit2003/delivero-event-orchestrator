export interface IdempotencyKey {
  id: number;
  tenant_id: string;
  event_id: string;
  idempotency_key: string;
  created_at: string;
}

export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

export enum EventStatus {
  NOT_STARTED = 'NOT_STARTED',
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  DLQ = 'DLQ',
}

export type EventStatusType = keyof typeof EventStatus;

export interface Event {
  id: string;
  tenant_id: string;
  event_type: string;
  source: string;
  original_payload: JSONValue;
  received_at: string;
  status: EventStatusType;
  attempt_count: number;
  next_retry_at: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

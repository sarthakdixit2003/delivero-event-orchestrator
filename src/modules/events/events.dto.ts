import type { JSONValue } from './events.model.js';

export interface CreateEventDto {
  tenant_id: string;
  event_type: string;
  source: string;
  original_payload: JSONValue;
  idempotency_key: string;
}

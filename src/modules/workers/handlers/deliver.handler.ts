import type { PoolClient } from 'pg';

export async function deliverEventHandler(
  event_id: string,
  tenant_id: string,
  subscription_id: string,
  outbox_id: string,
  client: PoolClient,
  worker_id: string,
) {}

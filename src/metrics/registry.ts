import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

export const register = new Registry();

collectDefaultMetrics({ register });

// ─────────────────────────────────────────────────────────────────────────────
// HTTP METRICS
// ─────────────────────────────────────────────────────────────────────────────

export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received by the application.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds.',
  labelNames: ['method', 'route'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1, 2.5, 5],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE METRICS
// ─────────────────────────────────────────────────────────────────────────────

export const queueJobsWaiting = new Gauge({
  name: 'queue_jobs_waiting',
  help: 'Number of jobs currently waiting in the BullMQ queue.',
  registers: [register],
});

export const queueJobsActive = new Gauge({
  name: 'queue_jobs_active',
  help: 'Number of jobs currently being processed by workers.',
  registers: [register],
});

export const queueJobsCompleted = new Counter({
  name: 'queue_jobs_completed_total',
  help: 'Total number of BullMQ jobs completed successfully.',
  registers: [register],
});

export const queueJobsFailed = new Counter({
  name: 'queue_jobs_failed_total',
  help: 'Total number of BullMQ jobs that failed after all retry attempts.',
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS / EVENT LIFECYCLE METRICS
// ─────────────────────────────────────────────────────────────────────────────

export const eventsIngested = new Counter({
  name: 'events_ingested_total',
  help: 'Total number of events successfully received and queued.',
  registers: [register],
});

export const eventsTransformed = new Counter({
  name: 'events_transformed_total',
  help: 'Total number of events successfully transformed.',
  registers: [register],
});

export const eventsDelivered = new Counter({
  name: 'events_delivered_total',
  help: 'Total number of events delivered to target webhook endpoints.',
  labelNames: ['status_code'] as const,
  registers: [register],
});

export const eventsDlq = new Counter({
  name: 'events_dlq_total',
  help: 'Total number of events moved to the Dead Letter Queue.',
  registers: [register],
});

export const eventE2eLatency = new Histogram({
  name: 'event_e2e_latency_seconds',
  help: 'End-to-end latency from event ingestion to successful delivery, in seconds.',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

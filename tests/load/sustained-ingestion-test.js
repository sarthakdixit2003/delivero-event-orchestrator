import http from 'k6/http';
import { check, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

const eventIngestionLatency = new Trend('event_ingestion_latency', true);
const failedRequests = new Counter('failed_requests');
const successRate = new Rate('success_rate');
const droppedRequests = new Counter('dropped_requests'); // when server can't keep up

// Sustained throughput: finds the server's actual max req/s ceiling
// No sleep() — constant-arrival-rate drives requests independent of VU think time
// Run with: k6 run tests/load/sustained-throughput.js
//
export const options = {
  scenarios: {
    sustained_250rps: {
      executor: 'constant-arrival-rate',
      rate: 250,
      timeUnit: '1s',
      duration: '1m', // run for 1 minute to get stable numbers
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<250'],
    http_req_failed: ['rate<0.01'],
    success_rate: ['rate>0.99'],
    dropped_requests: ['count<10'],
  },
};

function buildPayload() {
  return JSON.stringify({
    event_type: 'order.received',
    source: 'silk-road-3',
    original_payload: {
      order: {
        id: Math.random().toString(36).substring(2, 15),
        summary: {
          total_amount: '1250.75',
          currency: null,
          coupon_code: null,
        },
        flags: {
          expedited: 1,
          gift: 'false',
        },
        customer: {
          name: '  Jane Doe  ',
          email: 'JANE.DOE@EXAMPLE.COM',
          phone: '9876543210',
          newsletter_opt_in: 'true',
          addresses: [
            {
              type: 'home',
              is_primary: true,
              line1: '221B Baker Street',
              city: 'London',
              country: 'uk',
              geo: { lat: '51.5237', lng: '-0.1585' },
            },
            {
              type: 'work',
              is_primary: false,
              line1: '10 Downing Street',
              city: 'London',
              country: 'uk',
              geo: { lat: 51.5034, lng: -0.1276 },
            },
          ],
        },
        items: [
          {
            sku: Math.random().toString(36).substring(2, 15),
            qty: '2',
            unit_price: '499.99',
            product: {
              id: Math.random().toString(36).substring(2, 15),
              name: 'Wireless Mouse',
              category: 'accessories',
            },
            seller: {
              id: Math.random().toString(36).substring(2, 15),
              name: '  ACME Retail  ',
            },
            attributes: [
              { key: 'color', value: 'Black' },
              { key: 'warranty', value: '12 months' },
            ],
          },
          {
            sku: Math.random().toString(36).substring(2, 15),
            qty: 1,
            unit_price: 250,
            product: {
              id: Math.random().toString(36).substring(2, 15),
              name: 'Mechanical Keyboard',
              category: 'accessories',
            },
            seller: {
              id: Math.random().toString(36).substring(2, 15),
              name: 'KeyWorld',
            },
            attributes: [
              { key: 'layout', value: 'US' },
              { key: 'backlit', value: 'true' },
            ],
          },
        ],
      },
      metadata: {
        event_id: Math.random().toString(36).substring(2, 15),
        source: 'orchestrator',
      },
    },
    idempotency_key: Math.random().toString(36).substring(2, 15),
  });
}

export default function () {
  const BASE_URL = 'http://localhost:3000';

  group('Sustained Throughput - Event Ingestion', () => {
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': '019e6037-ad6a-7ed6-8396-a5b5291ab1c3',
      },
    };

    const response = http.post(`${BASE_URL}/api/v1/events`, buildPayload(), params);

    eventIngestionLatency.add(response.timings.duration);

    const passed = check(response, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'p99 response time < 250ms': (r) => r.timings.duration < 250,
      'response has event ID': (r) => {
        try {
          return JSON.parse(r.body).id !== undefined;
        } catch {
          return false;
        }
      },
    });

    successRate.add(passed);

    if (!passed) {
      failedRequests.add(1);
      if (response.status === 503 || response.status === 429) {
        droppedRequests.add(1);
      }
      console.error(`Request failed: ${response.status} — ${response.body}`);
    }
  });

  // No sleep() here — constant-arrival-rate handles pacing externally
}

# Performance Benchmark Report

This document details the performance characteristics and load testing results of the Event Orchestrator. The goal of these tests is to validate the system's ability to handle high-throughput event ingestion while maintaining low latency and high reliability.

## 1. Executive Summary

The Event Orchestrator demonstrates exceptional performance under both variable and sustained loads, maintaining sub-10ms p95 latency for event ingestion. During peak load and high-throughput simulations, the system achieved a **100% success rate** with zero errors, proving its robustness for production-grade event-driven architectures.

### Key Metrics Summary

| Metric | Ramp-up (50 VUs) | Sustained (100 RPS) | Sustained (250 RPS) |
| :--- | :--- | :--- | :--- |
| **Peak Throughput** | ~25 RPS | 100 RPS | **250 RPS** |
| **Average Latency** | 5.71 ms | 3.13 ms | **2.11 ms** |
| **p95 Latency** | 8.83 ms | 4.95 ms | **3.92 ms** |
| **p99 Latency** | - | 7.66 ms | **6.83 ms** |
| **Success Rate** | 100% | 100% | 100% |
| **Error Rate** | 0.00% | 0.00% | 0.00% |

---

## 2. Test Methodologies

### Tools & Environment
- **Load Testing Tool**: [k6](https://k6.io/)
- **Infrastructure**: Local development environment (representative of single-node performance).
- **Endpoint Tested**: `POST /api/v1/events` (Event Ingestion API).

### Scenario A: Ramp-up Ingestion
Designed to simulate a realistic ramp-up of traffic, peaking at 50 concurrent users with artificial think time.
1.  **Warm-up**: Ramp up to 10 VUs over 30s.
2.  **Base Load**: Sustain 10 VUs for 1 minute.
3.  **Stress Ramp**: Ramp up to 50 VUs over 30s.
4.  **Peak Load**: Sustain 50 VUs for 1 minute.
5.  **Cool-down**: Ramp down to 0 VUs over 30s.

### Scenario B: Sustained Throughput (100 RPS)
A constant-arrival-rate test designed to find the server's actual performance ceiling without client-side delays.
- **Target Rate**: 100 requests per second.
- **Duration**: 1 minute of sustained load.
- **VU Pool**: Warm pool of 50-100 VUs.

### Scenario C: High-Throughput Stress (250 RPS)
Pushing the single-node performance further to observe latency trends at higher volumes.
- **Target Rate**: 250 requests per second.
- **Duration**: 1 minute of sustained load.
- **VU Pool**: Warm pool of 50-100 VUs.

---

## 3. Detailed Results

### Scenario A (Ramp-up)
- **Average Latency**: 5.71 ms
- **p95 Latency**: 8.83 ms
- **Throughput**: Averaged 25.54 RPS (limited by VU sleep intervals).

### Scenario B (Sustained 100 RPS)
The system handled a constant 100 RPS with lower latency due to JIT and connection pool warming.
- **Average Latency**: 3.13 ms
- **p95 Latency**: 4.95 ms
- **p99 Latency**: 7.66 ms

### Scenario C (Sustained 250 RPS)
Even at 250 RPS, the system demonstrated excellent scalability, with average latency dropping to ~2ms and p95 remaining well under 5ms.
- **Average Latency**: 2.11 ms
- **p90 Latency**: 3.20 ms
- **p95 Latency**: 3.92 ms
- **p99 Latency**: 6.83 ms
- **Max Latency**: 53.86 ms
- **Dropped Requests**: 0

---

## 4. Architectural Performance Drivers

Several key architectural decisions contribute to these high-performance metrics:

1.  **Asynchronous Ingestion**: The API acknowledges event receipt immediately after basic validation and persistence to the outbox/queue, offloading heavy processing to background workers.
2.  **Redis-Backed Queueing**: Utilizing **BullMQ** and **Redis** for the event queue ensures high-speed, low-latency task management.
3.  **Efficient Middleware Stack**: Lightweight Express middleware for authentication and rate limiting ensures minimal overhead per request.
4.  **Database Indexing**: Optimized PostgreSQL schemas for the events and idempotency tables ensure fast lookups and inserts.

---

## 5. Scalability Projections

Based on the current benchmarks, the following scaling strategies are recommended for higher loads:

- **Horizontal Scaling**: The stateless nature of the API tier allows for easy horizontal scaling behind a load balancer (e.g., Nginx or AWS ALB).
- **Worker Scaling**: BullMQ workers can be scaled independently of the API to handle spikes in event processing/transformation volume.
- **Database Connection Pooling**: Implementing tools like **PgBouncer** will allow the system to handle thousands of concurrent database connections.
- **Redis Clustering**: For extremely high-volume event queues, Redis Sentinel or Clustering can be used to ensure high availability and shared load.

---

## 6. Conclusion

The Event Orchestrator is highly optimized for performance-critical applications. With a p95 latency under 10ms and perfect reliability under 50 concurrent users, it provides a solid foundation for building scalable, event-driven systems.

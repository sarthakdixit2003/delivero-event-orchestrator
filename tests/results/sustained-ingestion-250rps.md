apple@Apples-MacBook-Air-2 event-orchestrator % k6 run tests/load/sustained-ingestion-test.js

         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /

/ \/ \ | |/ / / ‾‾\
/ \ | ( | (‾) |
/ ****\_\_**** \ |\_|\_\ \_\_\_\_\_/

     execution: local
        script: tests/load/sustained-ingestion-test.js
        output: -

     scenarios: (100.00%) 1 scenario, 100 max VUs, 1m30s max duration (incl. graceful stop):
              * sustained_250rps: 250.00 iterations/s for 1m0s (maxVUs: 50-100, gracefulStop: 30s)

█ THRESHOLDS

    dropped_requests
    ✓ 'count<10' count=0

    http_req_duration
    ✓ 'p(95)<100' p(95)=3.92ms
    ✓ 'p(99)<250' p(99)=6.83ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    success_rate
    ✓ 'rate>0.99' rate=100.00%

█ TOTAL RESULTS

    checks_total.......: 45003   750.017424/s
    checks_succeeded...: 100.00% 45003 out of 45003
    checks_failed......: 0.00%   0 out of 45003

    ✓ status is 200 or 201
    ✓ p99 response time < 250ms
    ✓ response has event ID

    CUSTOM
    dropped_requests...............: 0       0/s
    event_ingestion_latency........: avg=2.11ms min=779µs    med=1.82ms max=53.86ms p(90)=3.2ms  p(95)=3.92ms
    success_rate...................: 100.00% 15001 out of 15001

    HTTP
    http_req_duration..............: avg=2.11ms min=779µs    med=1.82ms max=53.86ms p(90)=3.2ms  p(95)=3.92ms
      { expected_response:true }...: avg=2.11ms min=779µs    med=1.82ms max=53.86ms p(90)=3.2ms  p(95)=3.92ms
    http_req_failed................: 0.00%   0 out of 15001
    http_reqs......................: 15001   250.005808/s

    EXECUTION
    iteration_duration.............: avg=2.49ms min=923.45µs med=2.24ms max=54.28ms p(90)=3.56ms p(95)=4.32ms
    iterations.....................: 15001   250.005808/s
    vus............................: 1       min=1              max=1
    vus_max........................: 50      min=50             max=50

    NETWORK
    data_received..................: 26 MB   435 kB/s
    data_sent......................: 21 MB   357 kB/s

running (1m00.0s), 000/050 VUs, 15001 complete and 0 interrupted iterations
sustained_250rps ✓ [======================================] 000/050 VUs 1m0s 250.00 iters/s

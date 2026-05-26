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
              * sustained_100rps: 100.00 iterations/s for 1m0s (maxVUs: 50-100, gracefulStop: 30s)

█ THRESHOLDS

    dropped_requests
    ✓ 'count<10' count=0

    http_req_duration
    ✓ 'p(95)<100' p(95)=4.95ms
    ✓ 'p(99)<250' p(99)=7.66ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    success_rate
    ✓ 'rate>0.99' rate=100.00%

█ TOTAL RESULTS

    checks_total.......: 18003   300.022808/s
    checks_succeeded...: 100.00% 18003 out of 18003
    checks_failed......: 0.00%   0 out of 18003

    ✓ status is 200 or 201
    ✓ p99 response time < 250ms
    ✓ response has event ID

    CUSTOM
    dropped_requests...............: 0       0/s
    event_ingestion_latency........: avg=3.13ms min=930µs  med=2.77ms max=52.43ms p(90)=4.55ms p(95)=4.95ms
    success_rate...................: 100.00% 6001 out of 6001

    HTTP
    http_req_duration..............: avg=3.13ms min=930µs  med=2.77ms max=52.43ms p(90)=4.55ms p(95)=4.95ms
      { expected_response:true }...: avg=3.13ms min=930µs  med=2.77ms max=52.43ms p(90)=4.55ms p(95)=4.95ms
    http_req_failed................: 0.00%   0 out of 6001
    http_reqs......................: 6001    100.007603/s

    EXECUTION
    iteration_duration.............: avg=3.68ms min=1.07ms med=3.28ms max=58.47ms p(90)=5.14ms p(95)=5.59ms
    iterations.....................: 6001    100.007603/s
    vus............................: 0       min=0            max=0
    vus_max........................: 50      min=50           max=50

    NETWORK
    data_received..................: 10 MB   174 kB/s
    data_sent......................: 8.6 MB  143 kB/s

running (1m00.0s), 000/050 VUs, 6001 complete and 0 interrupted iterations
sustained_100rps ✓ [======================================] 000/050 VUs 1m0s 100.00 iters/s

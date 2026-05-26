apple@Apples-MacBook-Air-2 event-orchestrator % k6 run tests/load/ingestion.js

         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /

/ \/ \ | |/ / / ‾‾\
/ \ | ( | (‾) |
/ ****\_\_**** \ |\_|\_\ \_\_\_\_\_/

     execution: local
        script: tests/load/ingestion.js
        output: -

     scenarios: (100.00%) 1 scenario, 50 max VUs, 4m0s max duration (incl. graceful stop):
              * default: Up to 50 looping VUs for 3m30s over 5 stages (gracefulRampDown: 30s, gracefulStop: 30s)

█ THRESHOLDS

    http_req_duration
    ✓ 'p(95)<200' p(95)=8.83ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    success_rate
    ✓ 'rate>0.99' rate=100.00%

█ TOTAL RESULTS

    checks_total.......: 16107   76.620975/s
    checks_succeeded...: 100.00% 16107 out of 16107
    checks_failed......: 0.00%   0 out of 16107

    ✓ status is 200 or 201
    ✓ response time < 500ms
    ✓ response has event ID

    CUSTOM
    event_ingestion_latency........: avg=5.71ms min=1.03ms  med=5.74ms max=39.18ms p(90)=8.06ms p(95)=8.83ms
    success_rate...................: 100.00% 5369 out of 5369

    HTTP
    http_req_duration..............: avg=5.71ms min=1.03ms  med=5.74ms max=39.18ms p(90)=8.06ms p(95)=8.83ms
      { expected_response:true }...: avg=5.71ms min=1.03ms  med=5.74ms max=39.18ms p(90)=8.06ms p(95)=8.83ms
    http_req_failed................: 0.00%   0 out of 5369
    http_reqs......................: 5369    25.540325/s

    EXECUTION
    iteration_duration.............: avg=1.01s  min=503.6ms med=1s     max=1.51s   p(90)=1.41s  p(95)=1.46s
    iterations.....................: 5369    25.540325/s
    vus............................: 1       min=1            max=50
    vus_max........................: 50      min=50           max=50

    NETWORK
    data_received..................: 9.3 MB  45 kB/s
    data_sent......................: 7.7 MB  37 kB/s

running (3m30.2s), 00/50 VUs, 5369 complete and 0 interrupted iterations
default ✓ [======================================] 00/50 VUs 3m30s

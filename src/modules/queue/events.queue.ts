import { queueJobsActive, queueJobsWaiting } from '@/metrics/registry.js';
import { Queue } from 'bullmq';

const eventsQueue = new Queue('events', {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null,
  },
});

setInterval(async () => {
  const counts = await eventsQueue.getJobCounts('waiting', 'active');
  queueJobsWaiting.set(counts?.waiting ?? 0);
  queueJobsActive.set(counts?.active ?? 0);
}, 5000);

export default eventsQueue;

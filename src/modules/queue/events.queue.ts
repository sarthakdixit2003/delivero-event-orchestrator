import { Queue } from 'bullmq';

const eventsQueue = new Queue('events', {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null,
  },
});

export default eventsQueue;

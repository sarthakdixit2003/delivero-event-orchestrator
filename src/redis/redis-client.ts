import IORedis from 'ioredis';

const redisClient: IORedis.Redis = new IORedis.default({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

export default redisClient;

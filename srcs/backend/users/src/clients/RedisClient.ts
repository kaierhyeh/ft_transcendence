import Redis from 'ioredis';

// Create Redis client for Docker environment
const redis = new Redis({
  host: 'backend-redis', // Redis service name in docker-compose
  port: 6379,
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately, connect when first command is sent
});

// Create subscriber client for pub/sub (must be separate instance)
const subscriber = new Redis({
  host: 'backend-redis',
  port: 6379,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Handle connection events for main client
redis.on('connect', () => {
  console.log('✅ Redis connected (User Service)');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redis.on('ready', () => {
  console.log('🔄 Redis ready for friendship management');
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

// Handle connection events for subscriber
subscriber.on('connect', () => {
  console.log('✅ Redis subscriber connected (User Service)');
});

subscriber.on('error', (err) => {
  console.error('❌ Redis subscriber error:', err);
});

export { redis, subscriber };
export default redis;

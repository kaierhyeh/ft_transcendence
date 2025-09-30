import Redis from 'ioredis';

// Create Redis client for Docker environment
const redis = new Redis({
  host: '127.0.0.1', // Use 127.0.0.1 for Docker container localhost
  port: 6379,
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately, connect when first command is sent
});

// Handle connection events
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redis.on('ready', () => {
  console.log('🔄 Redis ready for user session management');
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

export default redis;
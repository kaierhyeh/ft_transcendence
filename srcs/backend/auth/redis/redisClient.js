import Redis from 'ioredis';

// Create a Redis client instance for auth service
// Using local Redis when REDIS_HOST is not set (single container)
const redis = new Redis({
	host: process.env.REDIS_HOST || '127.0.0.1',
	port: process.env.REDIS_PORT || 6379,
	retryDelayOnFailover: 100,
	lazyConnect: true,
});

export default redis;
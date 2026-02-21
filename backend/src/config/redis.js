/**
 * @module config/redis
 * @description Redis client connection
 * @created 2026-02-11
 */

// const { createClient } = require('redis');
// const { env } = require('./env');

// const redisClient = createClient({
//   socket: {
//     host: env.REDIS_HOST,
//     port: env.REDIS_PORT,
//   },
// });

// redisClient.on('error', (err) => {
//   console.error('Redis error:', err);
// });

// const connectRedis = async () => {
//   if (!redisClient.isOpen) {
//     await redisClient.connect();
//   }
// };

// module.exports = { redisClient, connectRedis };

const { Redis } = require('@upstash/redis');

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = { redisClient };
// controllers/healthController.js
import redis from "../config/redisClient.js";

export function serverStatus(req, res) {
    res.status(200).json({ message: "Server is running" });
}

export async function checkRedis(req, res) {
    try {
        const pong = await redis.ping();
        res.status(200).json({ redis: "up", response: pong });
    } catch (error) {
        console.error("Redis health check failed:", error);
        res.status(503).json({ redis: "down", message: "Redis is not available" });
    }
}
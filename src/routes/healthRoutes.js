import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.status(200).json({ message: "Server is running" });
});

router.get("/redis", async (req, res) => {
    try {
        const pong = await redis.ping();
        res.status(200).json({
            redis: "up",                
            response: pong
        });
    } catch (error) {
        console.error("Redis health check failed:", error);
        res.status(503).json({
            redis: "down",
            message: "Redis is not available"
        });
    }
});

export default router;
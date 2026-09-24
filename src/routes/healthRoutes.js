import { Router } from "express";
import redis from "../config/redisClient.js";
import { serverStatus, checkRedis } from "../controllers/healthController.js";
const router = Router();

router.get("/", serverStatus);
router.get("/redis", checkRedis);

export default router;

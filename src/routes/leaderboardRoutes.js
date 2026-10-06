import { Router } from "express";
import { addScore, getLeaderboard, getUserRank, nearestUsers } from "../controllers/leaderboardController.js";

const router = Router();

router.post("/score", addScore);
router.get("/", getLeaderboard);
router.get("/:userId/rank", getUserRank);
router.get("/:userId/nearest", nearestUsers);

export default router;

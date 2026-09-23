import { Router } from "express";
import { addScore, getLeaderboard, getUserRank } from "../controllers/leaderboardController.js";

const router = Router();

router.post("/score", addScore);
router.get("/", getLeaderboard);
router.get("/:userId/rank", getUserRank);

export default router;
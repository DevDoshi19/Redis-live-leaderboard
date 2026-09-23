// routes/leaderboardRoutes.js
import { Router } from "express";
import { postviews } from "../controllers/postController.js";

const router = Router();

router.post("/:id/view", postviews);

export default router;
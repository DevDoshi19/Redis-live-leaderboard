// routes/postRoutes.js
import { Router } from "express";
import { testrouter,postviews ,createPost } from "../controllers/postController.js";

const router = Router();

router.post("/test", testrouter);
router.post("/:id/view/:userid", postviews);
router.post("/:id", createPost);

export default router;

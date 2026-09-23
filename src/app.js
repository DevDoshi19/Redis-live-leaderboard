import express from "express";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import postRoutes from "./routes/postRoutes.js";

const app = express();
app.use(express.json());

app.use("/leaderboard", leaderboardRoutes);
app.use("/post", postRoutes);
app.use("/health", healthRoutes);

export default app;
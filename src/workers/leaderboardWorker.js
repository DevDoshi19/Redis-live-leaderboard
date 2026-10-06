import { Worker } from "bullmq";
import redis from "../config/redisClient.js";
import { LEADERBOARD_KEY } from "../constants/keys.js";

const connection = {
    host :"localhost",
    port : 6379
}

const worker = new Worker(
    "author-scores",
    async (job) => {
        const { authorId, postId } = job.data;
        console.log(`Processing job ${job.id}: award point to ${authorId} for post ${postId}`);
        await redis.zincrby(LEADERBOARD_KEY, 1, authorId);
    },
    { connection }
);

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed: ${job.data.authorId} got a point`);
});

worker.on("failed", (job, err) => {
    console.log(`Job ${job.id} failed:`, err.message);
});

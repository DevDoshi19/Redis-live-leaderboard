import { leaderboardQueue } from "../queues/leaderboardQueue.js";

await leaderboardQueue.add("award-point", {
    authorId: "testuser_2026",
    postId: "post_9001"
});

console.log("Fresh job added");
process.exit(0);
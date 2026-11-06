import { leaderboardQueue } from "../queues/leaderboardQueue.js";

await leaderboardQueue.add("award-point", {
    authorId: "testuser_2026",
    postId: "post_9001"
});

console.log("Fresh job added");
// process.exit(0);

await leaderboardQueue.add("award-point", {
    authorId: "durability_test_01",
    postId: "post_9002"
});

console.log("Durability test job added");
process.exit(0);
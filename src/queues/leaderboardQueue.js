import {Queue} from "bullmq";

const connection = {
    host :"localhost",
    port : 6379
}

export const leaderboardQueue = new Queue("author-scores", { connection });
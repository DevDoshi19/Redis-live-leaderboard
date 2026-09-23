export const LEADERBOARD_KEY = process.env.LEADERBOARD_KEY || "leaderboard:global";
export const getPostViewsKey = (postId) => `post:${postId}:views`;
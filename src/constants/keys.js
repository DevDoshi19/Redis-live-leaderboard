export const LEADERBOARD_KEY = process.env.LEADERBOARD_KEY || "leaderboard:global";
export const getPostViewsKey = (postId) => `post:${postId}:views`;
export const getPostMetaKey = (postId) => `post:${postId}:meta`;
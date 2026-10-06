// controllers/leaderboardController.js
import redis from "../config/redisClient.js";
import { LEADERBOARD_KEY } from "../constants/keys.js";

export async function addScore(req, res) {
    try{

        const userId = req.body.userId;
        const score = req.body.score;

        if (!userId || typeof(userId) !== "string"){
            return res.status(400).json({
                message:"No user with this user Id ",
                userId:userId,
            })
        }
        if (
            typeof score !== "number" ||
            !Number.isFinite(score) ||
            score <= 0
        ){
            return res.status(400).json({
                message:"Score must be a positive finite number",
                userId:userId,
                score:score
            })
        }

        const points = await redis.zincrby(LEADERBOARD_KEY,score,userId)
        res.status(200).json({
            user:userId,
            score:Number(points)
        
        })

    }catch(err){
        console.error(err);
        res.status(500).json({
            message:"Failed to return score"
        })
    }
}

export async function getLeaderboard(req, res) {

    try{
        const page = req.query.page === undefined ? 1 : Number(req.query.page);
        const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

        if (page <= 0 || limit <= 0 || !Number.isInteger(page) || !Number.isInteger(limit)|| limit > 100) {
            return res.status(400).json({
                message: "Invalid page or limit values"
            });
        }

        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const data = await redis.zrevrange(LEADERBOARD_KEY,start,end,"WITHSCORES");
        const leaderboard = [];
        for (let i = 0; i < data.length; i += 2) {
            leaderboard.push({
                rank: start + (i / 2) + 1,
                userId: data[i],
                score: Number(data[i + 1])
            });
        }
        res.status(200).json({
            leaderboard:leaderboard
        })
    }
    catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch leaderboard"
        });
    }
}

export async function getUserRank(req, res) {
    try {
        const userId = req.params.userId;
        const result = await redis.zrevrank(LEADERBOARD_KEY, userId, "WITHSCORE");
        if (!result) {
            return res.status(404).json({ message: "User not found in leaderboard", userId });
        }
        const [rank, score] = result;
        if (rank === null || score === null) {
            return res.status(404).json({ message: "User not found in leaderboard", userId });
        }

        res.status(200).json({ userId, rank: rank + 1, score: Number(score) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch user rank" });
    }
}

export async function nearestUsers(req, res) {

    try {
        const userId = req.params.userId;
        const rank = await redis.zrevrank(LEADERBOARD_KEY, userId);
        if (rank === null) {
            return res.status(404).json(
                { 
                    message: "User not found in leaderboard", 
                    userId 
                }
            );
        }
        const spread = 2;
        const windowSize = spread * 2 + 1;

        let start = Math.max(0, rank - spread);
        let end = start + windowSize - 1; 
        
        const data = await redis.zrevrange(LEADERBOARD_KEY,start,end,"WITHSCORES");
        
        const leaderboard = [];
        for (let i = 0; i < data.length; i += 2) {
            
            leaderboard.push({
                rank : start + (i / 2) + 1,
                userId: data[i],
                score: Number(data[i + 1]),
                isYou: data[i] === userId
            });
        }        
        res.status(200).json({
            leaderboard    
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            message: "Failed to fetch nearest user rank" 
        });
    }
}


import express from "express";
import Redis from "ioredis";

const app = express();
app.use(express.json());
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
redis.on("error",(err)=>{
    console.log("Redis connection error:", err);
})
const LEADERBOARD_KEY = "leaderboard:global"

function getKey(postId){
    return `post:${postId}:views` ;
}

// make the first endpoint to check if the Redis server is running
app.get("/redis", async (req, res) => {
    try {
        const pong = await redis.ping();
        res.status(200).json({
            redis: "up",
            response: pong
        });
    } catch (error) {
        console.error("Redis health check failed:", error);

        res.status(503).json({
            redis: "down",
            message: "Redis is not available"
        });
    }
});

// 1st endpoint incr the score of a post 
app.post("/post/:id/view",async (req,res)=>{
    try{
        const postId = req.params.id ;
    
        const views = await redis.incr(getKey(postId));

        res.status(200).json({
            post:postId,
            views:views
        })
    }catch(err){
        console.error(err);
        res.status(500).json({
            message:"A view, request failed"
        })
    }
})

//2 leaderborad score 
app.post("/leaderboard/score",async (req,res)=>{

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

})
// leaderboard endpoint to get the top 10 users with their scores
app.get("/leaderboard",async (req,res)=>{

    try{
        const data = await redis.zrevrange(LEADERBOARD_KEY,0,9,"WITHSCORES");
        const leaderboard = [];
        for (let i = 0; i < data.length; i += 2) {
            leaderboard.push({
                rank: i / 2 + 1,
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

})
// leaderboard endpoint to get the user rank and score
app.get("/leaderboard/:userId/rank",async (req,res)=>{

    try{
        const userId = req.params.userId;
        
        const rank = await redis.zrevrank(LEADERBOARD_KEY,userId);
        if (rank === null) {
            return res.status(404).json({
                message: "User not found in leaderboard",
                userId: userId
            });
        }
        const score = await redis.zscore(LEADERBOARD_KEY, userId);
        res.status(200).json({
            userId: userId,
            rank: rank + 1,
            score: Number(score)
        });
    }catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch user rank"
        });
    }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
})

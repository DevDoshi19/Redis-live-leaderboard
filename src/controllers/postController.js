import redis from "../config/redisClient.js";
import { getPostMetaKey, getPostViewsKey } from "../constants/keys.js";
import { leaderboardQueue } from "../queues/leaderboardQueue.js";
export async function postviews(req,res){
   
    try{
        const postId = req.params.id ;
        const userId = req.params.userid;
        if (!userId || userId === "null" || userId === "undefined"){
            return res.status(400).json({
                message:"No user with this user Id ",
                userId:userId,
            })
        }
        let views;
        const isViewed = await redis.set(`post:${postId}:viewed:${userId}`,"true",'EX',86400,'NX');
        if(isViewed === "OK"){
            views = await redis.incr(getPostViewsKey(postId));
        }else{
            views = await redis.get(getPostViewsKey(postId));
        }
        return res.status(200).json({
            post:postId,
            user:userId,
            newView: isViewed === 'OK' ,
            views: Number(views||0)
        })

    }catch(err){
        console.error(err);
        res.status(500).json({
            message:"A view, request failed"
        })
    }
};
export async function createPost(req,res){

    try{
        const postId = req.params.id ;
        const {authorId,title} = req.body;
    
        if (!authorId || typeof authorId !== "string"){
            return res.status(400).json({
                message:"Author Id is required and must be a string",
                body:req.body,
            })
        }
        await redis.hset(getPostMetaKey(postId),{
            authorId,
            title:title||"Untitled Post",
        })

        res.status(201).json({
            message:"Post created successfully",
            postId:postId,
            authorId:authorId,
            title:title||"Untitled Post",
        })
    }
    catch(err){
        console.error(err);
        res.status(500).json({
            message:"A create post, request failed"
        })
    }
};

export async function testrouter(req,res){
    await leaderboardQueue.add("award-point", { authorId: "testuser", postId: "999" });
}
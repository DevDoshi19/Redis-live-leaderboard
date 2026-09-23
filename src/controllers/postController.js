import redis from "../config/redisClient.js";
import { LEADERBOARD_KEY } from "../constants/keys.js";
export async function postviews(req,res){
   
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

}
 
export default postviews;
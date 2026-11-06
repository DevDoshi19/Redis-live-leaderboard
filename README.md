# Redis Live Leaderboard

A Redis-powered leaderboard system built with **Node.js, Express, Redis, and BullMQ**. The project explores real-time score management, post-view tracking, Redis data structures, asynchronous job processing, and worker-based architecture.

The core idea is simple:

When a user views a post, the system tracks the view and awards one leaderboard point to the post's author. Instead of updating the leaderboard directly inside the API request, the application pushes a job into a BullMQ queue, which is processed asynchronously by a separate worker.

---

## Overview

This project demonstrates how Redis can be used beyond simple caching to build backend systems involving:

- Real-time leaderboards.
- View tracking and duplicate-view prevention.
- Redis Hashes, Strings, and Sorted Sets.
- Atomic Redis operations.
- Asynchronous job processing with BullMQ.
- Producer-consumer architecture.
- Background workers.
- Eventual consistency.
- Queue persistence across worker restarts.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API development |
| Redis | In-memory data store |
| ioredis | Redis client for Node.js |
| BullMQ | Asynchronous job queue |
| Docker | Redis containerization |
| JavaScript (ES Modules) | Application development |

## Architecture

The application uses a producer-consumer architecture.

- **Producer:** Express API receives requests and adds jobs to BullMQ.
- **Queue:** BullMQ stores and manages pending jobs using Redis.
- **Consumer:** A separate worker processes jobs and updates the leaderboard.
- **Redis:** Stores post metadata, view counts, deduplication keys, leaderboard scores, and queue state.

### System Flow

```text
              CLIENT
                 |
                 |
          Express API
                 |
          POST /post/:id/view/:userid
                 |
                 v
          postviews Controller
                 |
          Check duplicate view
                 |
          +------+------+
          |             |
       Already        New View
       Viewed            |
          |              v
          |         INCR View Count
          |              |
          |              v
          |       Get Post Metadata
          |              |
          |              v
          |        Extract Author ID
          |              |
          |              v
          |         BullMQ Queue
          |              |
          |              v
          |        Redis Queue State
          |              |
          |              v
          |       Background Worker
          |              |
          |              v
          |          ZINCRBY
          |              |
          |              v
          |       Redis Leaderboard
          |              |
          +--------------+
```

## Project Structure

```text
redis-live-leaderboard/
│
├── src/
│   │
│   ├── config/
│   │   └── redisClient.js
│   │
│   ├── constants/
│   │   └── keys.js
│   │
│   ├── controllers/
│   │   ├── postController.js
│   │   └── leaderboardController.js
│   │
│   ├── routes/
│   │   ├── postRoutes.js
│   │   └── leaderboardRoutes.js
│   │
│   ├── queues/
│   │   └── leaderboardQueue.js
│   │
│   ├── workers/
│   │   └── leaderboardWorker.js
│   │
│   ├── test/
│   │   └── testQueue.js
│   │
│   └── index.js
│
├── package.json
└── README.md
```

*The structure represents the current application organization; additional files may exist in the repository.*

---

## Features Implemented

### 1. Redis Leaderboard

The leaderboard uses a Redis Sorted Set.

Redis key:

```text
leaderboard:global
```

Each member represents a user, and its score represents the user's points.

Example:

```text
Dev Doshi  → 15
Purva      → 10
Krishna    → 7
```

Commands explored and implemented:

```redis
ZINCRBY leaderboard:global 1 "Dev Doshi"

ZREVRANGE leaderboard:global 0 -1 WITHSCORES

ZREVRANK leaderboard:global "Dev Doshi"

ZSCORE leaderboard:global "Dev Doshi"
```

**Why Sorted Sets?**

Redis Sorted Sets maintain members with associated scores and allow efficient ranking and leaderboard retrieval.

### 2. Post View Tracking

Each post maintains an independent view counter.

Example Redis key:

```text
post:59:views
```

The `INCR` command increments the view count.

```redis
INCR post:59:views
```

The API uses the post ID to identify the corresponding counter.

### 3. Duplicate View Prevention

The system prevents the same user from repeatedly increasing a post's view count within a 24-hour window.

Redis key:

```text
post:59:viewed:dev
```

Implementation:

```js
await redis.set(
    `post:${postId}:viewed:${userId}`,
    "true",
    "EX",
    86400,
    "NX"
);
```

Understanding the options:

- `EX 86400`: Key expires after 24 hours.
- `NX`: Set the key only if it does not already exist.

Redis returns:

- `"OK"` when the key is created.
- `null` when the key already exists.

Only a new view triggers the view counter increment and leaderboard job creation.

### 4. Post Metadata and Author Mapping

Posts now contain author information.

Redis key:

```text
post:59:meta
```

Redis Hash:

```text
authorId → Dev Doshi
title    → I am too Good
```

Created using:

```js
await redis.hset(getPostMetaKey(postId), {
    authorId,
    title: title || "Untitled Post"
});
```

When someone views a post, the application retrieves its metadata:

```js
const meta = await redis.hgetall(
    getPostMetaKey(postId)
);
```

This allows the backend to identify the author who should receive the leaderboard point.

### 5. Asynchronous Job Processing with BullMQ

Instead of updating the leaderboard directly inside the request handler, the application submits a background job.

Queue:

```text
author-scores
```

Job name:

```text
award-point
```

Job payload:

```js
{
    authorId: "Dev Doshi",
    postId: "59"
}
```

Job creation:

```js
await leaderboardQueue.add("award-point", {
    authorId: meta.authorId,
    postId
});
```

This separates the API request from the leaderboard update.

The API acts as the producer, while the worker acts as the consumer.

### 6. Background Worker

A separate BullMQ worker listens to the `author-scores` queue.

```js
const worker = new Worker(
    "author-scores",
    async (job) => {
        const { authorId, postId } = job.data;

        console.log(
            `Processing job ${job.id}: award point to ${authorId} for post ${postId}`
        );

        await redis.zincrby(
            LEADERBOARD_KEY,
            1,
            authorId
        );
    },
    { connection }
);
```

The worker:

1. Receives a job from the queue.
2. Extracts the author ID and post ID.
3. Increments the author's leaderboard score.
4. Marks the job as completed if processing succeeds.

Worker event listeners:

```js
worker.on("completed", (job) => {
    console.log(
        `Job ${job.id} completed: ${job.data.authorId} got a point`
    );
});

worker.on("failed", (job, err) => {
    console.log(`Job ${job.id} failed:`, err.message);
});
```

### 7. Queue and Worker Separation

The API and worker run as separate Node.js processes.

This means the API does not need to perform the leaderboard update itself.

The queue acts as the communication layer between the two processes.

```text
Express API
    |
    | queue.add()
    v
BullMQ Queue
    |
    | Job available
    v
Background Worker
    |
    | ZINCRBY
    v
Redis Leaderboard
```

---

## Redis Data Model

The application uses different Redis data structures for different requirements.

| Redis Key | Data Type | Purpose |
|---|---|---|
| `leaderboard:global` | Sorted Set | Stores user scores and rankings |
| `post:{id}:views` | String | Stores post view count |
| `post:{id}:viewed:{userId}` | String | Prevents duplicate views |
| `post:{id}:meta` | Hash | Stores post author and title |
| BullMQ internal keys | Various | Stores queue and job state |

Example:

```text
Redis
│
├── leaderboard:global
│     ├── Dev Doshi → 15
│     └── Purva     → 10
│
├── post:59:meta
│     ├── authorId → Purva
│     └── title    → I am too Good
│
├── post:59:views
│     └── 1
│
└── post:59:viewed:dev
      └── true
```

All these keys exist in the same Redis instance but serve different purposes.

---

## API Endpoints

### 1. Create a Post

**Endpoint:**

```http
POST /post/:id
```

Example:

```http
POST /post/59
```

Request body:

```json
{
    "authorId": "Purva",
    "title": "I am too Good"
}
```

Expected response:

```json
{
    "message": "Post created successfully",
    "postId": "59",
    "authorId": "Purva",
    "title": "I am too Good"
}
```

### 2. View a Post

**Endpoint:**

```http
POST /post/:id/view/:userid
```

Example:

```http
POST /post/59/view/dev
```

Expected response for a new view:

```json
{
    "post": "59",
    "user": "dev",
    "newView": true,
    "views": 1
}
```

If the same user views the post again within the deduplication window:

```json
{
    "post": "59",
    "user": "dev",
    "newView": false,
    "views": 1
}
```

### 3. Leaderboard APIs

The project also includes leaderboard functionality for retrieving rankings, user ranks, and nearby users.

See `leaderboardRoutes.js` and `leaderboardController.js` for the implemented endpoints.

---

## Running the Project

### Prerequisites

- Node.js
- npm
- Docker Desktop
- Redis
- Basic understanding of REST APIs and Redis

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd redis-live-leaderboard
```

### 2. Install dependencies

```bash
npm install
```

Main dependencies:

```bash
npm install express ioredis bullmq
```

### 3. Start Redis using Docker

Use your configured Redis container:

```bash
docker start live-leaderboard_redis
```

If you haven't created the container yet, an example setup is:

```bash
docker run -d \
  --name live-leaderboard_redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 4. Start the API server

```bash
npm run dev
```

### 5. Start the background worker

Open another terminal:

```bash
npm run worker
```

Keep both processes running.

### 6. Run the queue test

```bash
node src/test/testQueue.js
```

Example test:

```js
await leaderboardQueue.add("award-point", {
    authorId: "testuser_2026",
    postId: "post_9001"
});
```

---

## Testing Asynchronous Processing

One of the important experiments in this project was testing what happens when a worker is stopped.

### Experiment: Worker Restart

**Step 1:** Stop the worker using `Ctrl + C`.

**Step 2:** Submit a new job while the worker is stopped.

**Step 3:** Restart the worker.

**Observed result:**

The worker picked up the waiting job and processed it after restarting.

```text
Worker stopped
      |
      v
Job added to BullMQ
      |
      v
Job remains waiting
      |
      v
Worker restarted
      |
      v
Job processed
      |
      v
Leaderboard updated
```

This demonstrates that pending jobs can survive a worker restart while Redis remains available and retains its queue data.

---

## Important Redis Concepts Explored

During development, the following Redis concepts were explored:

| Concept | What it does |
|---|---|
| `SET` / `GET` | Stores and retrieves values |
| `EX` | Configures key expiration |
| `NX` | Creates a key only if it doesn't exist |
| `INCR` | Atomically increments a numeric counter |
| `HSET` / `HGETALL` | Stores and retrieves Hash fields |
| `ZINCRBY` | Increments a Sorted Set member's score |
| `ZREVRANGE` | Retrieves members in descending score order |
| `ZREVRANK` | Retrieves a member's descending rank |
| `ZSCORE` | Retrieves a member's score |
| `MULTI` / `EXEC` | Executes a group of Redis commands atomically |
| `WATCH` | Supports optimistic concurrency control |
| Lua scripting | Executes custom Redis logic atomically |
| Redis TTL | Controls key expiration |

## Engineering Concepts Learned

This project explores several important backend engineering concepts:

**1. Atomic Operations**

Using Redis commands such as `INCR`, `ZINCRBY`, and `SET NX` to perform atomic data operations.

**2. Producer-Consumer Architecture**

Separating job creation from job processing using BullMQ.

**3. Asynchronous Processing**

Moving non-immediate business operations out of the main API request flow.

**4. Eventual Consistency**

The post view counter updates immediately, while the author's leaderboard score updates asynchronously after the worker processes the job.

**5. Queue Durability**

Pending jobs remain available for processing after a worker restart, provided Redis retains the queue data.

**6. Separation of Responsibilities**

Keeping HTTP request handling, queue management, and background processing in separate modules.

---

## Current Scope and Future Improvements

The current implementation establishes the basic asynchronous leaderboard flow. The following improvements are potential next steps, not claims about completed functionality.

- Configure BullMQ retry attempts and exponential backoff.
- Add idempotent job processing to prevent duplicate point awards after retries.
- Validate post existence and author metadata before enqueueing jobs.
- Prevent unintended overwrites when registering existing posts.
- Add job failure recovery and better logging.
- Test worker crashes during job processing.
- Add monitoring for waiting, active, completed, and failed jobs.
- Explore reconciliation between the leaderboard and a persistent source of truth.
- Add proper authentication and authorization for post creation and view tracking.

## Learning Objective

The main objective of this project is to understand how Redis and BullMQ work together to build asynchronous backend systems.

Rather than simply incrementing a leaderboard score inside an API controller, the project demonstrates how to separate business operations, manage background jobs, and handle work independently of the API request lifecycle.

**Built as a hands-on backend engineering and Redis learning project.**

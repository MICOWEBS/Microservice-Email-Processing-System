# Two-Microservice Email Processing System

## Overview
This project demonstrates a robust microservice architecture using Node.js, TypeScript, MongoDB, Redis (BullMQ), and Mongoose. It consists of two independent services:

- **Service A (API Service):** Accepts and queues email messages via HTTP endpoints.
- **Service B (Worker Service):** Processes queued jobs and simulates sending emails.

## Architecture
- **API Service** exposes REST endpoints for message creation and retrieval.
- **Worker Service** listens to a Redis queue and processes jobs asynchronously.
- **MongoDB** stores all messages.
- **Redis** (BullMQ) is used for job queuing and microservice communication.

```
Client --> [API Service] --> (MongoDB)
                        \-> (Redis Queue) --> [Worker Service] --> (MongoDB)
```

## Tech Stack
- Node.js + TypeScript
- Express (API)
- Mongoose (MongoDB ODM)
- BullMQ + ioredis (Redis queue)
- Joi (validation)
- Winston (logging)
- dotenv (env config)

## Folder Structure
```
service-a-api/
  src/
    index.ts
    models/Message.ts
  .env
  package.json
  tsconfig.json

service-b-worker/
  src/
    worker.ts
    models/Message.ts
  .env
  package.json
  tsconfig.json
```

## Environment Variables
Each service has a `.env` file. Example:

**service-a-api/.env**
```
PORT=3001
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/email_microservices
REDIS_URL=redis://<user>:<pass>@<host>:<port>
```

**service-b-worker/.env**
```
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/email_microservices
REDIS_URL=redis://<user>:<pass>@<host>:<port>
```

> **Note:**
> - For MongoDB Atlas, whitelist your IP and use the correct credentials.
> - For Redis Cloud, use the provided connection string.

## Setup & Installation
1. Clone the repo and `cd` into the project root.
2. Install dependencies for each service:
   ```sh
   cd service-a-api && npm install
   cd ../service-b-worker && npm install
   ```
3. Fill in the `.env` files for each service.

## Running the Services
**API Service:**
```sh
cd service-a-api
npm run dev
```

**Worker Service:**
```sh
cd service-b-worker
npm run dev
```

## Testing the System
- **POST a message:**
  ```sh
  curl -X POST http://localhost:3001/messages \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","message":"Hello from microservices!"}'
  ```
- **GET all messages:**
  ```sh
  curl http://localhost:3001/messages
  ```
- **Health check:**
  ```sh
  curl http://localhost:3001/health
  ```

## Deployment Notes
- Both services can be deployed independently (e.g., on different servers or containers).
- Ensure both can access the same MongoDB and Redis instances.
- Use process managers (like PM2) or Docker Compose for production.

## Security & Robustness
- Input validation with Joi
- Structured logging with Winston
- Idempotent job processing
- Graceful shutdown
- Health checks

## License
MIT 
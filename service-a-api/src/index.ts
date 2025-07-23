import express from 'express';
import mongoose from 'mongoose';
import { Queue } from 'bullmq';
import { config } from 'dotenv';
import IORedis from 'ioredis';
import { Message } from './models/Message';
import Joi from 'joi';
import winston from 'winston';

config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/email_microservices';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => {
    logger.error('MongoDB connection error', { error: err });
    process.exit(1);
  });

// Set up Redis connection for BullMQ
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const messageQueue = new Queue('message-queue', { connection });

// Joi schema for validation
const messageSchema = Joi.object({
  email: Joi.string().email().required(),
  message: Joi.string().min(1).max(1000).required(),
});

// POST /messages endpoint
app.post('/messages', async (req, res) => {
  const { error, value } = messageSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    logger.warn('Validation failed', { details: error.details });
    return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
  }
  const { email, message } = value;
  try {
    // Save to MongoDB
    const saved = await Message.create({ email, message });
    // Push job to BullMQ
    await messageQueue.add('send-message', { messageId: saved._id }, { attempts: 3 });
    logger.info('Message saved and job queued', { id: saved._id, email });
    res.status(201).json({ id: saved._id, email: saved.email, message: saved.message });
  } catch (err) {
    logger.error('Error saving message', { error: err });
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /messages endpoint
app.get('/messages', async (_req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    logger.error('Error fetching messages', { error: err });
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// /health endpoint
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  let redisOk = false;
  try {
    await connection.ping();
    redisOk = true;
  } catch {
    redisOk = false;
  }
  res.json({ mongo: mongoOk ? 'up' : 'down', redis: redisOk ? 'up' : 'down' });
});

// Placeholder root route
app.get('/', (_req, res) => {
  res.send('Service A (API) is running');
});

const server = app.listen(PORT, () => {
  logger.info(`Service A (API) listening on port ${PORT}`);
});

// Graceful shutdown
function shutdown() {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    mongoose.disconnect();
    connection.quit();
    logger.info('Shutdown complete.');
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);


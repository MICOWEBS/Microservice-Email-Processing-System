import mongoose from 'mongoose';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { Message } from './models/Message';
import { config } from 'dotenv';
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

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/email_microservices';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => logger.info('Worker connected to MongoDB'))
  .catch((err) => {
    logger.error('MongoDB connection error', { error: err });
    process.exit(1);
  });

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker('message-queue', async (job: Job) => {
  const { messageId } = job.data;
  try {
    // Idempotency: check if already sent
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    if ((message as any).sent) {
      logger.info('Message already sent, skipping', { id: messageId });
      return;
    }
    // Simulate sending
    logger.info('Sending message', { email: message.email, message: message.message });
    console.log(`Sending message to ${message.email}: ${message.message}`);
    // Mark as sent
    (message as any).sent = true;
    await message.save();
  } catch (err) {
    logger.error('Worker job error', { error: err, jobId: job.id });
    throw err; // Let BullMQ handle retries
  }
}, {
  connection
});

worker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id });
});

worker.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job?.id, error: err });
});

// Graceful shutdown
function shutdown() {
  logger.info('Worker shutting down gracefully...');
  worker.close().then(() => {
    mongoose.disconnect();
    connection.quit();
    logger.info('Worker shutdown complete.');
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);


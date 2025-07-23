
import mongoose, { Schema, Document, model } from 'mongoose';

export interface IMessage extends Document {
  email: string;
  message: string;
  createdAt: Date;
  sent?: boolean;
}

const MessageSchema = new Schema<IMessage>({
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  sent: { type: Boolean, default: false },
});

export const Message = model<IMessage>('Message', MessageSchema); 

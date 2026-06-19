import mongoose, { Schema, Document } from 'mongoose';

export interface ICapsule extends Document {
  creator: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: 'standard' | 'friendship' | 'letter';
  contentType: 'text' | 'media' | 'voice';
  isLocked: boolean;
  unlockCondition: {
    type: 'time' | 'followers' | 'capsules' | 'custom';
    targetDate?: Date;
    targetCount?: number;
    description?: string;
    isFulfilled: boolean;
  };
  text?: string;
  mediaUrls?: string[];
  voiceUrl?: string;
  collaborators: mongoose.Types.ObjectId[];
  likes: mongoose.Types.ObjectId[];
  comments: {
    user: mongoose.Types.ObjectId;
    name: string;
    text: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const capsuleSchema = new Schema<ICapsule>(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['standard', 'friendship', 'letter'],
      required: true,
    },
    contentType: {
      type: String,
      enum: ['text', 'media', 'voice'],
      required: true,
    },
    isLocked: {
      type: Boolean,
      default: true,
    },
    unlockCondition: {
      type: {
        type: String,
        enum: ['time', 'followers', 'capsules', 'custom'],
        required: true,
      },
      targetDate: {
        type: Date,
      },
      targetCount: {
        type: Number,
      },
      description: {
        type: String,
        default: '',
      },
      isFulfilled: {
        type: Boolean,
        default: false,
      },
    },
    text: {
      type: String,
    },
    mediaUrls: {
      type: [String],
      default: [],
    },
    voiceUrl: {
      type: String,
    },
    collaborators: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Capsule = mongoose.model<ICapsule>('Capsule', capsuleSchema);

export default Capsule;

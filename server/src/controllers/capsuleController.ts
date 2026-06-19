import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Capsule, { ICapsule } from '../models/Capsule';
import User from '../models/User';

// Helper to check if a capsule's lock condition is met and update it
const checkAndUnlockCapsule = async (capsule: ICapsule): Promise<ICapsule> => {
  if (!capsule.isLocked) {
    return capsule;
  }

  const cond = capsule.unlockCondition;
  let shouldUnlock = false;
  const creatorId = (capsule.creator as any)._id || capsule.creator;

  if (cond.type === 'time' && cond.targetDate) {
    if (new Date() >= new Date(cond.targetDate)) {
      shouldUnlock = true;
    }
  } else if (cond.type === 'followers') {
    const creatorUser = await User.findById(creatorId);
    if (creatorUser && creatorUser.followers.length >= (cond.targetCount || 0)) {
      shouldUnlock = true;
    }
  } else if (cond.type === 'capsules') {
    const creatorCapsuleCount = await Capsule.countDocuments({ creator: creatorId });
    if (creatorCapsuleCount >= (cond.targetCount || 0)) {
      shouldUnlock = true;
    }
  }

  if (shouldUnlock) {
    capsule.isLocked = false;
    capsule.unlockCondition.isFulfilled = true;
    await capsule.save();
  }

  return capsule;
};

// Helper to sanitize capsule content based on locked state
const sanitizeCapsule = (capsule: ICapsule, userId: string): any => {
  const capsuleObj = capsule.toObject();

  // If locked, strip the secret content fields to prevent sniffing/cheating
  if (capsuleObj.isLocked) {
    delete capsuleObj.text;
    delete capsuleObj.mediaUrls;
    delete capsuleObj.voiceUrl;
  }

  return capsuleObj;
};

// @desc    Create a new capsule
// @route   POST /api/capsules
// @access  Private
export const createCapsule = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    type,
    contentType,
    unlockCondition,
    text,
    mediaUrls,
    voiceUrl,
    collaborators,
  } = req.body;

  const userId = (req as any).user._id;

  if (!title || !type || !contentType || !unlockCondition || !unlockCondition.type) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  const cond: any = {
    type: unlockCondition.type,
    isFulfilled: false,
    description: unlockCondition.description || '',
  };

  if (unlockCondition.targetDate) {
    cond.targetDate = new Date(unlockCondition.targetDate);
  }
  if (unlockCondition.targetCount !== undefined) {
    cond.targetCount = Number(unlockCondition.targetCount);
  }

  // Resolve collaborators (User IDs, Emails, or names) to ObjectIds
  const resolvedCollaboratorIds: string[] = [];
  for (const c of (collaborators || [])) {
    const identifier = typeof c === 'object' && c !== null && c._id ? c._id : c;
    if (typeof identifier === 'string' && identifier.trim()) {
      const trimmed = identifier.trim();
      if (trimmed.includes('@')) {
        const foundUser = await User.findOne({ email: trimmed.toLowerCase() });
        if (foundUser) {
          resolvedCollaboratorIds.push(foundUser._id.toString());
        } else {
          res.status(400);
          throw new Error(`Collaborator with email ${trimmed} not found`);
        }
      } else if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
        resolvedCollaboratorIds.push(trimmed);
      } else {
        const foundUser = await User.findOne({ name: trimmed });
        if (foundUser) {
          resolvedCollaboratorIds.push(foundUser._id.toString());
        } else {
          res.status(400);
          throw new Error(`Collaborator "${trimmed}" is not a valid User ID, email, or name`);
        }
      }
    }
  }

  // Create the capsule
  const capsule = await Capsule.create({
    creator: userId,
    title,
    description: description || '',
    type,
    contentType,
    unlockCondition: cond,
    text: text || '',
    mediaUrls: mediaUrls || [],
    voiceUrl: voiceUrl || '',
    collaborators: resolvedCollaboratorIds,
    isLocked: true,
  });

  res.status(201).json(capsule);
});

// @desc    Get all capsules for current user (created or collaborated)
// @route   GET /api/capsules
// @access  Private
export const getCapsules = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id.toString();

  // Find capsules where user is creator or collaborator
  const capsules = await Capsule.find({
    $or: [{ creator: userId }, { collaborators: userId }],
  })
    .sort({ createdAt: -1 })
    .populate('creator', 'name email profilePicture');

  // Check and unlock if conditions are met, then sanitize
  const processedCapsules = await Promise.all(
    capsules.map(async (capsule) => {
      const updated = await checkAndUnlockCapsule(capsule);
      return sanitizeCapsule(updated, userId);
    })
  );

  res.status(200).json(processedCapsules);
});

// @desc    Get single capsule by ID
// @route   GET /api/capsules/:id
// @access  Private
export const getCapsuleById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id.toString();
  const capsule = await Capsule.findById(req.params.id)
    .populate('creator', 'name email profilePicture')
    .populate('collaborators', 'name email profilePicture');

  if (!capsule) {
    res.status(404);
    throw new Error('Capsule not found');
  }

  // Auth check: User must be creator or collaborator
  const isCreator = capsule.creator._id.toString() === userId;
  const isCollaborator = capsule.collaborators.some((col: any) => col._id.toString() === userId);

  if (!isCreator && !isCollaborator) {
    res.status(403);
    throw new Error('Access denied to this capsule');
  }

  const updated = await checkAndUnlockCapsule(capsule);
  res.status(200).json(sanitizeCapsule(updated, userId));
});

// @desc    Unlock a capsule (for custom conditions or manual override by creator)
// @route   POST /api/capsules/:id/unlock
// @access  Private
export const unlockCapsule = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id.toString();
  const capsule = await Capsule.findById(req.params.id);

  if (!capsule) {
    res.status(404);
    throw new Error('Capsule not found');
  }

  // Only the creator can trigger manual unlock
  if (capsule.creator.toString() !== userId) {
    res.status(403);
    throw new Error('Only the creator can unlock this capsule');
  }

  capsule.isLocked = false;
  capsule.unlockCondition.isFulfilled = true;
  await capsule.save();

  // Populate creator and collaborators so front-end does not crash on render
  await capsule.populate([
    { path: 'creator', select: 'name email profilePicture' },
    { path: 'collaborators', select: 'name email profilePicture' }
  ]);

  res.status(200).json(capsule);
});

// @desc    Toggle like on a capsule
// @route   POST /api/capsules/:id/like
// @access  Private
export const toggleLike = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const capsule = await Capsule.findById(req.params.id);

  if (!capsule) {
    res.status(404);
    throw new Error('Capsule not found');
  }

  // Allow liking locked or unlocked capsules (shows excitement for locked ones too!)
  const isLiked = capsule.likes.includes(userId);

  if (isLiked) {
    capsule.likes = capsule.likes.filter((id) => id.toString() !== userId.toString());
  } else {
    capsule.likes.push(userId);
  }

  await capsule.save();
  res.status(200).json({ likes: capsule.likes });
});

// @desc    Add comment to a capsule
// @route   POST /api/capsules/:id/comment
// @access  Private
export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body;
  const user = (req as any).user;

  if (!text) {
    res.status(400);
    throw new Error('Comment text is required');
  }

  const capsule = await Capsule.findById(req.params.id);

  if (!capsule) {
    res.status(404);
    throw new Error('Capsule not found');
  }

  // Comments only allowed on unlocked capsules
  const updated = await checkAndUnlockCapsule(capsule);
  if (updated.isLocked) {
    res.status(400);
    throw new Error('Cannot comment on a locked capsule');
  }

  capsule.comments.push({
    user: user._id,
    name: user.name,
    text,
    createdAt: new Date(),
  });

  await capsule.save();
  res.status(200).json(capsule.comments);
});

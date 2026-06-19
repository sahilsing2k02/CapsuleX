import express from 'express';
import {
  createCapsule,
  getCapsules,
  getCapsuleById,
  unlockCapsule,
  toggleLike,
  addComment,
} from '../controllers/capsuleController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
  .post(protect, createCapsule)
  .get(protect, getCapsules);

router.route('/:id')
  .get(protect, getCapsuleById);

router.post('/:id/unlock', protect, unlockCapsule);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/comment', protect, addComment);

export default router;

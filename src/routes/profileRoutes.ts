import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { getProfile, updateProfile } from '../controllers/profileController';

const router = express.Router();

router.get('/:userId', asyncHandler(getProfile));
router.put('/:userId', asyncHandler(updateProfile));

export default router;

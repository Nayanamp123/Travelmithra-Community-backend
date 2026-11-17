import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { register, login, verifyAgentOtp } from '../controllers/authController';

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/agent/verify-otp', asyncHandler(verifyAgentOtp));

export default router;

import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { register, login, verifyAgentOtp, sendRegistrationOtp, verifyRegistrationOtp } from '../controllers/authController';

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/register/send-otp', asyncHandler(sendRegistrationOtp));
router.post('/register/verify-otp', asyncHandler(verifyRegistrationOtp));
router.post('/login', asyncHandler(login));
router.post('/agent/verify-otp', asyncHandler(verifyAgentOtp));

export default router;

import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { register, login } from '../controllers/authController';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';

const router = express.Router();

// Account creation is an admin-authorized operation. The new user still receives
// their own email/password and uses the normal login endpoint afterward.
router.post('/register', adminAuthMiddleware, asyncHandler(register));
router.post('/login', asyncHandler(login));

export default router;

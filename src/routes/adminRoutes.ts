import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { loginAdmin, getUsers, updateUserRole, deleteUser } from '../controllers/adminController';

const router = express.Router();

router.post('/login', asyncHandler(loginAdmin));
router.use(adminAuthMiddleware);
router.get('/users', asyncHandler(getUsers));
router.patch('/users/:userId/role', asyncHandler(updateUserRole));
router.delete('/users/:userId', asyncHandler(deleteUser));

export default router;

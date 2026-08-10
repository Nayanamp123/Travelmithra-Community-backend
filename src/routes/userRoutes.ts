import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { getAllUsers, updateRole, deleteUser } from '../controllers/userController';

const router = express.Router();

router.get('/', asyncHandler(getAllUsers));
router.patch('/:userId/role', asyncHandler(updateRole));
router.delete('/:userId', asyncHandler(deleteUser));

export default router;

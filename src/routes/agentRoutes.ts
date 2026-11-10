import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { createAgentBooking, deleteAgentReward, getAgentRewards, getAgentSales } from '../controllers/agentController';

const router = express.Router();
router.get('/sales', asyncHandler(getAgentSales));
router.post('/sales', asyncHandler(createAgentBooking));
router.get('/rewards', asyncHandler(getAgentRewards));
router.delete('/rewards/:rewardId', asyncHandler(deleteAgentReward));
export default router;

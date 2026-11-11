import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { teamLeadAuthMiddleware } from '../middlewares/teamLeadAuthMiddleware';
import {
  getTeamLeadAgents,
  getTeamLeadCustomers,
  getTeamLeadBookings,
  getTeamLeadRewards,
} from '../controllers/teamLeadController';

const router = express.Router();
router.use(teamLeadAuthMiddleware);
router.get('/agents', asyncHandler(getTeamLeadAgents));
router.get('/customers', asyncHandler(getTeamLeadCustomers));
router.get('/bookings', asyncHandler(getTeamLeadBookings));
router.get('/rewards', asyncHandler(getTeamLeadRewards));

export default router;

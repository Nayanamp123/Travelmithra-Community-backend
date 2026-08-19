import express, { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { loginAdmin, getUsers, updateUserRole, deleteUser, isAdminRequest } from '../controllers/adminController';
import {
  getCustomers,
  createCustomer,
  getBookings,
  createBooking,
  deleteBooking,
  getRewards,
  createReward,
  updateRewardStatus,
} from '../controllers/adminController';

const router = express.Router();
function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!isAdminRequest(req)) {
    return res.status(401).json({
      error: 'Admin credentials required',
    });
  }

  next();
}

router.post('/login', asyncHandler(loginAdmin));
router.use(adminAuthMiddleware);
router.get('/users', asyncHandler(getUsers));
router.patch('/users/:userId/role', asyncHandler(updateUserRole));
router.delete('/users/:userId', asyncHandler(deleteUser));


// CUSTOMERS
router.get('/customers',requireAdmin,getCustomers);
router.post('/customers',requireAdmin,createCustomer);


//BOOKINGS
router.get('/bookings',requireAdmin,getBookings);
router.post('/bookings',requireAdmin,createBooking);
router.delete('/bookings/:bookingId',requireAdmin,deleteBooking);

// REWARDS
router.get('/rewards',requireAdmin,getRewards);
router.post('/rewards',requireAdmin,createReward);
router.patch('/rewards/:rewardId/status',requireAdmin,updateRewardStatus)
export default router;

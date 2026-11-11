import type { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/userService';
import { findApprovedBookingsForCustomer } from '../repository/userRepository';
import { isConfiguredTeamLead, getConfiguredTeamLeadCredentials } from '../middlewares/teamLeadAuthMiddleware';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, username, phone, password, avatar, referralCode, termsAccepted, consultantId, salesExecutive } = req.body;
    if (!name || !username || !phone || !password) {
      return res.status(400).json({ error: 'Name, username, phone, and password are required' });
    }
    if (termsAccepted !== true) return res.status(400).json({ error: 'You must agree to the agent rules and regulations' });
    // Every completed member registration is an agent. Keep the role and
    // consultant ID in their intended argument positions.
    const user = await registerUser(name, username, phone, password, avatar, referralCode, true, 'agent', salesExecutive, consultantId);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, username, password } = req.body;
    const identifier = String(username || email || '').trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email or customer name and password are required' });
    }

    if (isConfiguredTeamLead(identifier, password)) {
      const credentials = getConfiguredTeamLeadCredentials();
      return res.json({
        message: 'Team Lead login successful',
        user: {
          id: 0,
          name: credentials.username,
          email: credentials.username,
          referralCode: '',
          referredBy: null,
          role: 'team_lead',
        },
        bookings: [],
      });
    }

    const user = await loginUser(identifier, password);
    const bookings = user.role === 'customer'
      ? await findApprovedBookingsForCustomer(user.name)
      : [];
    res.json({ message: 'Login successful', user, bookings });
  } catch (error) {
    next(error);
  }
}

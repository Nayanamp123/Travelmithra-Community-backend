import type { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/userService';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, referralCode, role, salesExecutive } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const allowedRoles = ['traveler', 'admin', 'agent', 'sales_executive'];
    if (role && !allowedRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (role === 'sales_executive' && !['Aliya', 'Keerthi'].includes(salesExecutive)) return res.status(400).json({ error: 'Choose Aliya or Keerthi' });
    const user = await registerUser(name, email, password, referralCode, role || 'traveler', salesExecutive);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await loginUser(email, password);
    res.json({ message: 'Login successful', user });
  } catch (error) {
    next(error);
  }
}

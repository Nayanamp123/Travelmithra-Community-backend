import type { Request, Response, NextFunction } from 'express';
import { getUserProfile, editUserProfile } from '../services/userService';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = Number(req.params.userId);
    const user = await getUserProfile(userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = Number(req.params.userId);
    const { name, email, avatar } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const user = await editUserProfile(userId, name, email, avatar);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

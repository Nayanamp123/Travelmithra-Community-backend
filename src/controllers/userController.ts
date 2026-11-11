import type { Request, Response, NextFunction } from 'express';
import { listUsers, changeUserRole, assignUserToTeamLead, removeUser } from '../services/userService';

export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = Number(req.params.userId);
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }
    const user = await changeUserRole(userId, role);
    res.json({ message: 'Role updated successfully', user });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = Number(req.params.userId);
    await removeUser(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateSalesExecutive(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = Number(req.params.userId);
    const salesExecutive = typeof req.body.salesExecutive === 'string' ? req.body.salesExecutive.trim() : null;
    const user = await assignUserToTeamLead(userId, salesExecutive);
    res.json({ message: 'Team Lead assignment updated successfully', user });
  } catch (error) {
    next(error);
  }
}

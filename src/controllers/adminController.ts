import type { Request, Response, NextFunction } from 'express';
import { authenticateAdmin, getAllUsers, changeUserRole, removeUser } from '../services/adminService';

export async function loginAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password} = req.body;
    const result = await authenticateAdmin(username, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = Number(req.params.userId);
    const { role } = req.body;
    if (!role) {
      return res.status(401).json({ error: 'Role is required' });
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

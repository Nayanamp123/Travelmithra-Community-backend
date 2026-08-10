import type { User } from '../types';
import {
  findAllUsersWithReferrer,
  updateUserRoleInRepository,
  deleteUserById,
} from '../repository/adminRepository';

export async function authenticateAdmin(username: string, password: string): Promise<{ message: string; username: string }> {
  const configuredUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
  const configuredPassword = process.env.ADMIN_PASSWORD?.trim() || 'admin123';
  const submittedUsername = username?.trim();
  const submittedPassword = password?.trim();

  if (submittedUsername === configuredUsername && submittedPassword === configuredPassword) {
    return { message: 'Admin authenticated successfully', username: submittedUsername };
  }

  const error = new Error('Invalid admin username or password') as Error & { status?: number };
  error.status = 401;
  throw error;
}

export async function getAllUsers(): Promise<User[]> {
  return findAllUsersWithReferrer();
}

export async function changeUserRole(userId: number, role: string): Promise<User> {
  const updated = await updateUserRoleInRepository(userId, role);
  if (!updated) {
    const error = new Error('User not found') as Error & { status?: number };
    error.status = 404;
    throw error;
  }
  return updated;
}

export async function removeUser(userId: number): Promise<User> {
  const deleted = await deleteUserById(userId);
  if (!deleted) {
    const error = new Error('User not found') as Error & { status?: number };
    error.status = 404;
    throw error;
  }
  return deleted;
}

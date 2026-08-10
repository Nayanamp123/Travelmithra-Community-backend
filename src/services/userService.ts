import crypto from 'crypto';
import type { User } from '../types';
import {
  findUserByEmail,
  findUserByCredentials,
  findUserByReferralCode,
  insertUser,
  findUserById,
  findAllUsersWithReferrer,
  updateUserProfile,
  updateUserRole,
  deleteUserById,
  referralCodeExists,
} from '../repository/userRepository';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex');
}

async function generateUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  while (await referralCodeExists(code)) {
    code = generateReferralCode();
  }
  return code;
}

function normalizeReferralCode(referralCode?: string | null): string | null {
  const value = referralCode?.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const codeFromQuery =
      url.searchParams.get('ref') ||
      url.searchParams.get('referralCode') ||
      url.searchParams.get('code');

    if (codeFromQuery?.trim()) {
      return codeFromQuery.trim();
    }

    const lastPathSegment = url.pathname.split('/').filter(Boolean).pop();
    return lastPathSegment?.trim() || null;
  } catch {
    return value;
  }
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  referralCode?: string | null,
  role = 'traveler',
  salesExecutive?: string | null
): Promise<User> {
  const existing = await findUserByEmail(email);
  if (existing) {
    const error = new Error('Email already exists') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  let referredBy: number | null = null;
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  if (normalizedReferralCode) {
    const referrer = await findUserByReferralCode(normalizedReferralCode);
    if (referrer) {
      referredBy = referrer.id;
    }
  }

  const newReferralCode = await generateUniqueReferralCode();
  const passwordHash = hashPassword(password);

  return insertUser({
    name,
    email,
    passwordHash,
    referralCode: newReferralCode,
    referredBy,
    role,
    salesExecutive,
  });
}

export async function loginUser(email: string, password: string): Promise<User> {
  const user = await findUserByCredentials(email, hashPassword(password));
  if (!user) {
    const error = new Error('Invalid email or password') as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  return user;
}

export async function getUserProfile(userId: number): Promise<User> {
  const user = await findUserById(userId);
  if (!user) {
    const error = new Error('User not found') as Error & { status?: number };
    error.status = 404;
    throw error;
  }
  return user;
}

export async function editUserProfile(
  userId: number,
  name: string,
  email: string,
  avatar?: string | null
): Promise<User> {
  const updated = await updateUserProfile(userId, name, email, avatar);
  if (!updated) {
    const error = new Error('User not found') as Error & { status?: number };
    error.status = 404;
    throw error;
  }
  return updated;
}

export async function listUsers(): Promise<User[]> {
  return findAllUsersWithReferrer();
}

export async function changeUserRole(userId: number, role: string): Promise<User> {
  const updated = await updateUserRole(userId, role);
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

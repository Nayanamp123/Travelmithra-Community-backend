import type { User } from '../types';
import { queryDatabase } from './database';

type UserRow = {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  referral_code: string;
  referred_by: number | null;
  role: string;
  sales_executive?: string | null;
  created_at?: string;
  updated_at?: string;
  referred_by_name?: string | null;
};

type CreateUserData = {
  name: string;
  email: string;
  passwordHash: string;
  referralCode: string;
  referredBy: number | null;
  role: string;
  salesExecutive?: string | null;
};

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar ?? null,
    referralCode: row.referral_code,
    referredBy: row.referred_by ?? null,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    referredByName: row.referred_by_name ?? null,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await queryDatabase<UserRow>(
    'SELECT id, name, email, avatar, referral_code, referred_by, role FROM users WHERE email = $1',
    [email]
  );
  return result.rows.length > 0 ? mapUserRow(result.rows[0]) : null;
}

export async function findUserByCredentials(email: string, passwordHash: string): Promise<User | null> {
  const result = await queryDatabase<UserRow>(
    'SELECT id, name, email, avatar, referral_code, referred_by, role FROM users WHERE email = $1 AND password = $2',
    [email, passwordHash]
  );
  return result.rows.length > 0 ? mapUserRow(result.rows[0]) : null;
}

export async function findUserByReferralCode(code: string): Promise<{ id: number } | null> {
  const result = await queryDatabase<{ id: number }>('SELECT id FROM users WHERE referral_code = $1', [code]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function insertUser(data: CreateUserData): Promise<User> {
  const result = await queryDatabase<UserRow>(
    'INSERT INTO users (name, email, password, referral_code, referred_by, role, sales_executive) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, avatar, referral_code, referred_by, role, sales_executive',
    [data.name, data.email, data.passwordHash, data.referralCode, data.referredBy, data.role, data.salesExecutive || null]
  );
  return mapUserRow(result.rows[0]);
}

export async function findUserById(userId: number): Promise<User | null> {
  const result = await queryDatabase<UserRow>(
    'SELECT id, name, email, avatar, referral_code, referred_by, role FROM users WHERE id = $1',
    [userId]
  );
  return result.rows.length > 0 ? mapUserRow(result.rows[0]) : null;
}

export async function findAllUsersWithReferrer(): Promise<User[]> {
  const result = await queryDatabase<UserRow>(
    `SELECT u.id, u.name, u.email, u.avatar, u.role, u.created_at, u.referral_code, u.referred_by, r.name AS referred_by_name
     FROM users u
     LEFT JOIN users r ON u.referred_by = r.id
     ORDER BY u.name ASC`
  );
  return result.rows.map(mapUserRow);
}

export async function updateUserProfile(
  userId: number,
  name: string,
  email: string,
  avatar?: string | null
): Promise<User | null> {
  const result = await queryDatabase<UserRow>(
    'UPDATE users SET name = $1, email = $2, avatar = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, email, avatar, referral_code, referred_by, role',
    [name, email, avatar ?? null, userId]
  );
  return result.rows.length > 0 ? mapUserRow(result.rows[0]) : null;
}

export async function updateUserRole(userId: number, role: string): Promise<User | null> {
  const result = await queryDatabase<UserRow>(
    'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, avatar, referral_code, referred_by, role',
    [role, userId]
  );
  return result.rows.length > 0 ? mapUserRow(result.rows[0]) : null;
}

export async function deleteUserById(userId: number): Promise<User | null> {
  const result = await queryDatabase<UserRow>('DELETE FROM users WHERE id = $1 RETURNING id, name, email, avatar, referral_code, referred_by, role', [userId]);
  return result.rows.length > 0 ? mapUserRow(result.rows[0]) : null;
}

export async function referralCodeExists(code: string): Promise<boolean> {
  const result = await queryDatabase<{ id: number }>('SELECT id FROM users WHERE referral_code = $1', [code]);
  return result.rows.length > 0;
}

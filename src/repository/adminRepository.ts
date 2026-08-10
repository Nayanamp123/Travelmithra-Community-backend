import type { User } from '../types';
import { queryDatabase } from './database';

type AdminUserRow = {
  id:  number;
  name: string;
  email: string;
  avatar: string | null;
  referral_code: string;
  referred_by: number | null;
  role: string;
  created_at?: string;
  updated_at?: string;
  referred_by_name?: string | null;
};

function mapUserRow(row: AdminUserRow): User {
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

export async function findAllUsersWithReferrer(): Promise<User[]> {
  const result = await queryDatabase<AdminUserRow>(
    `SELECT u.id, u.name, u.email, u.avatar, u.role, u.created_at, u.referral_code, u.referred_by, r.name AS referred_by_name
     FROM users u
     LEFT JOIN users r ON u.referred_by = r.id
     ORDER BY u.name ASC`
  );

  return result.rows.map(mapUserRow);
}

export async function updateUserRoleInRepository(userId: number, role: string): Promise<User | null> {
  const result = await queryDatabase<AdminUserRow>(
    'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, avatar, referral_code, referred_by, role, created_at, updated_at',
    [role, userId]
  );

  return result.rows.length > 0 ? mapUserRow(result.rows[0]) : null;
}

export async function deleteUserById(userId: number): Promise<User | null> {
  const result = await queryDatabase<AdminUserRow>(
    'DELETE FROM users WHERE id = $1 RETURNING id, name, email, avatar, referral_code, referred_by, role, created_at, updated_at',
    [userId]
  );

  return result.rows.length > 0 ? mapUserRow(result.rows[0]) : null;
}

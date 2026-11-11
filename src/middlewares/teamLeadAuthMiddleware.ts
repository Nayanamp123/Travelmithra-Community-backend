import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { queryDatabase } from '../repository/database';

export type TeamLeadIdentity = { id: number; name: string; email: string; role: string };
export type TeamLeadRequest = Request & { teamLead?: TeamLeadIdentity };

export function getConfiguredTeamLeadCredentials() {
  return {
    username: process.env.TEAM_LEAD_USERNAME?.trim() || 'TLONE',
    password: process.env.TEAM_LEAD_PASSWORD?.trim() || 'TL123',
  };
}

export function isConfiguredTeamLead(username: string, password: string): boolean {
  const configured = getConfiguredTeamLeadCredentials();
  return username === configured.username && password === configured.password;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function teamLeadAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const username = String(req.header('x-team-lead-username') || '').trim();
    const password = String(req.header('x-team-lead-password') || '');
    if (!username || !password) {
      return res.status(401).json({ error: 'Team Lead credentials required' });
    }

    if (isConfiguredTeamLead(username, password)) {
      (req as TeamLeadRequest).teamLead = {
        id: 0,
        name: username,
        email: username,
        role: 'team_lead',
      };
      return next();
    }

    const result = await queryDatabase<TeamLeadIdentity & { password: string }>(
      `SELECT id, name, email, role, password
       FROM users
       WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1))
         AND password = $2
         AND role = 'team_lead'
       LIMIT 1`,
      [username, hashPassword(password)]
    );

    const identity = result.rows[0];
    if (!identity) return res.status(403).json({ error: 'Team Lead access required' });

    (req as TeamLeadRequest).teamLead = {
      id: identity.id,
      name: identity.name,
      email: identity.email,
      role: identity.role,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

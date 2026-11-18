import type { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/userService';
import { findApprovedBookingsForCustomer } from '../repository/userRepository';
import { isConfiguredTeamLead, getConfiguredTeamLeadCredentials } from '../middlewares/teamLeadAuthMiddleware';
import crypto from 'crypto';
import { queryDatabase } from '../repository/database';
import { sendOtpEmail } from '../services/emailService';

const otpHash = (otp: string) => crypto.createHash('sha256').update(otp).digest('hex');

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

export async function sendRegistrationOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, username, phone, password, avatar, referralCode, termsAccepted, consultantId, salesExecutive } = req.body;
    if (!name || !username || !phone || !password || !/^\S+@\S+\.\S+$/.test(String(username)) || termsAccepted !== true) return res.status(400).json({ error: 'Valid name, email, phone, password, and accepted terms are required' });
    const existing = await queryDatabase('SELECT id FROM users WHERE email = $1 OR username = $1', [String(username).trim()]);
    if (existing.rows.length) return res.status(400).json({ error: 'Email is already registered' });
    const challengeId = crypto.randomUUID();
    const otp = String(crypto.randomInt(100000, 1000000));
    await queryDatabase('INSERT INTO agent_registration_otps (challenge_id, payload, otp_hash, expires_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL \'10 minutes\')', [challengeId, { name, username, phone, password, avatar, referralCode, termsAccepted, consultantId, salesExecutive }, otpHash(otp)]);
    await sendOtpEmail(String(username).trim(), otp);
    res.json({ message: 'Registration OTP sent', challengeId, maskedEmail: `${String(username).slice(0, 2)}***${String(username).slice(String(username).indexOf('@'))}` });
  } catch (error) { next(error); }
}

export async function verifyRegistrationOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { challengeId, otp } = req.body;
    const result = await queryDatabase<any>('SELECT * FROM agent_registration_otps WHERE challenge_id = $1', [challengeId]);
    const row = result.rows[0];
    if (!row || new Date(row.expires_at).getTime() < Date.now() || row.attempts >= 5) return res.status(401).json({ error: 'OTP expired or invalid' });
    await queryDatabase('UPDATE agent_registration_otps SET attempts = attempts + 1 WHERE challenge_id = $1', [challengeId]);
    if (!/^\d{6}$/.test(String(otp)) || row.otp_hash !== otpHash(String(otp))) return res.status(401).json({ error: 'Invalid OTP' });
    const p = row.payload;
    const user = await registerUser(p.name, p.username, p.phone, p.password, p.avatar, p.referralCode, true, 'agent', p.salesExecutive, p.consultantId);
    await queryDatabase('DELETE FROM agent_registration_otps WHERE challenge_id = $1', [challengeId]);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) { next(error); }
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
    if (user.role === 'agent' || user.role === 'sales_executive') {
      if (!user.email) return res.status(400).json({ error: 'No email address is registered for this agent' });
      const challengeId = crypto.randomUUID();
      const otp = String(crypto.randomInt(100000, 1000000));
      await queryDatabase('INSERT INTO agent_login_otps (challenge_id, user_id, otp_hash, expires_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL \'10 minutes\')', [challengeId, user.id, otpHash(otp)]);
      await sendOtpEmail(user.email, otp);
      return res.json({ message: 'OTP sent', otpRequired: true, challengeId, maskedEmail: `${String(user.email).slice(0, 2)}***${String(user.email).slice(String(user.email).indexOf('@'))}` });
    }
    res.json({ message: 'Login successful', user, bookings });
  } catch (error) {
    next(error);
  }
}

export async function verifyAgentOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { challengeId, otp } = req.body;
    if (!challengeId || !/^\d{6}$/.test(String(otp))) return res.status(400).json({ error: 'Challenge ID and six-digit OTP are required' });
    const result = await queryDatabase<any>('SELECT o.*, u.id, u.name, u.email, u.phone, u.avatar, u.referral_code, u.referred_by, u.role FROM agent_login_otps o JOIN users u ON u.id = o.user_id WHERE o.challenge_id = $1', [challengeId]);
    const row = result.rows[0];
    if (!row || new Date(row.expires_at).getTime() < Date.now() || row.attempts >= 5) return res.status(401).json({ error: 'OTP expired or invalid' });
    await queryDatabase('UPDATE agent_login_otps SET attempts = attempts + 1 WHERE challenge_id = $1', [challengeId]);
    if (row.otp_hash !== otpHash(String(otp))) return res.status(401).json({ error: 'Invalid OTP' });
    await queryDatabase('DELETE FROM agent_login_otps WHERE challenge_id = $1', [challengeId]);
    res.json({ message: 'Login successful', user: { id: row.id, name: row.name, email: row.email, phone: row.phone, avatar: row.avatar, referralCode: row.referral_code, referredBy: row.referred_by, role: row.role }, bookings: [] });
  } catch (error) { next(error); }
}

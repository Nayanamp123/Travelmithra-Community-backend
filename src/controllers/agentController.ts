import type { Request, Response, NextFunction } from 'express';
import { queryDatabase } from '../repository/database';
import crypto from 'crypto';

function agentName(req: Request) {
  return String(req.header('x-agent-username') || '').trim();
}

export async function getAgentSales(req: Request, res: Response, next: NextFunction) {
  try {
    const agent = agentName(req);
    if (!agent) return res.status(401).json({ error: 'Agent username is required' });
    const result = await queryDatabase(`SELECT id, customer, route, date, amount, received, adults, kids, active, payment_mode AS "paymentMode", remarks FROM bookings WHERE LOWER(TRIM(executive)) = LOWER(TRIM($1)) ORDER BY date DESC`, [agent]);
    res.json({ sales: result.rows });
  } catch (error) { next(error); }
}

export async function getAgentRewards(req: Request, res: Response, next: NextFunction) {
  try {
    const agent = agentName(req);
    if (!agent) return res.status(401).json({ error: 'Agent username is required' });
    const result = await queryDatabase(`SELECT id, agent, traveler, booking_id AS "bookingId", amount, note, status, created_at AS "createdAt" FROM rewards WHERE LOWER(TRIM(agent)) = LOWER(TRIM($1)) AND status <> 'archived' ORDER BY created_at DESC`, [agent]);
    res.json({ rewards: result.rows });
  } catch (error) { next(error); }
}

export async function createAgentBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const agent = agentName(req);
    const { customer, route, date, amount, adults = 1, kids = 0, remarks = '' } = req.body;
    if (!agent || !customer || !route || !date) return res.status(400).json({ error: 'Agent, customer, destination, and date are required' });
    const bookingId = `AG-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const booking = await queryDatabase(
      `INSERT INTO bookings (id, customer, route, date, amount, received, previous, adults, kids, executive, active, payment_mode, remarks) VALUES ($1,$2,$3,$4,$5,0,0,$6,$7,$8,TRUE,'PENDING',$9) RETURNING id, customer, route, date, amount, executive`,
      [bookingId, customer.trim(), route.trim(), date, Number(amount || 0), Number(adults), Number(kids), agent, remarks]
    );
    await queryDatabase(
      `INSERT INTO rewards (agent, traveler, booking_id, amount, note, status) VALUES ($1,$2,$3,0,'Customer added by agent; reward pending admin approval','issued')`,
      [agent, customer.trim(), bookingId]
    );
    res.status(201).json({ booking: booking.rows[0] });
  } catch (error) { next(error); }
}

export async function deleteAgentReward(req: Request, res: Response, next: NextFunction) {
  try {
    const agent = agentName(req);
    const rewardId = Number(req.params.rewardId);
    if (!agent || !rewardId) return res.status(400).json({ error: 'Agent and reward are required' });
    const result = await queryDatabase(`UPDATE rewards SET status = 'archived' WHERE id = $1 AND LOWER(TRIM(agent)) = LOWER(TRIM($2)) RETURNING id`, [rewardId, agent]);
    if (!result.rows.length) return res.status(404).json({ error: 'Reward not found for this agent' });
    res.json({ message: 'Reward removed from your session' });
  } catch (error) { next(error); }
}

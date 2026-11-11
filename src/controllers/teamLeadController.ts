import type { Response } from 'express';
import { queryDatabase } from '../repository/database';
import type { TeamLeadRequest } from '../middlewares/teamLeadAuthMiddleware';

function leadName(req: TeamLeadRequest): string {
  return req.teamLead?.name || '';
}

function hasFullTeamLeadView(req: TeamLeadRequest): boolean {
  return req.teamLead?.id === 0;
}

export async function getTeamLeadAgents(req: TeamLeadRequest, res: Response) {
  const result = await queryDatabase(`
    SELECT id, name, email, phone, role, sales_executive AS "salesExecutive", created_at AS "createdAt"
    FROM users
    WHERE role IN ('agent', 'sales_executive')
      AND ($1 = TRUE OR LOWER(TRIM(COALESCE(sales_executive, ''))) = LOWER(TRIM($2)))
    ORDER BY name ASC
  `, [hasFullTeamLeadView(req), leadName(req)]);
  return res.json({ agents: result.rows });
}

export async function getTeamLeadCustomers(_req: TeamLeadRequest, res: Response) {
  const result = await queryDatabase(`
    SELECT id, name, email, phone, trips, joined, active, created_at AS "createdAt"
    FROM admin_customers
    ORDER BY created_at DESC
  `);
  return res.json({ customers: result.rows });
}

export async function getTeamLeadBookings(_req: TeamLeadRequest, res: Response) {
  const result = await queryDatabase(`
    SELECT id, customer, route, date, amount, received, previous, adults, kids,
           executive, active, payment_mode AS "paymentMode", remarks,
           created_at AS "createdAt"
    FROM bookings
    ORDER BY created_at DESC
  `);
  return res.json({ bookings: result.rows });
}

export async function getTeamLeadRewards(req: TeamLeadRequest, res: Response) {
  const result = await queryDatabase(`
    SELECT r.id, r.agent, r.traveler, r.booking_id AS "bookingId", r.amount,
           r.note, r.status, r.created_at AS "createdAt"
    FROM rewards r
    LEFT JOIN users u ON LOWER(TRIM(u.name)) = LOWER(TRIM(r.agent))
       OR LOWER(TRIM(u.email)) = LOWER(TRIM(r.agent))
       OR LOWER(TRIM(u.username)) = LOWER(TRIM(r.agent))
    WHERE r.status <> 'archived'
      AND ($1 = TRUE OR LOWER(TRIM(COALESCE(u.sales_executive, ''))) = LOWER(TRIM($2)))
    ORDER BY r.created_at DESC
  `, [hasFullTeamLeadView(req), leadName(req)]);
  return res.json({ rewards: result.rows });
}

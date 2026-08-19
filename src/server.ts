import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import { corsMiddleware } from './middlewares/corsMiddleware';
import { errorHandler } from './middlewares/errorHandler';
import { queryDatabase, initializeDatabase } from './repository/database';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(express.json());
corsMiddleware(app);



app.get('/', (req, res) => {
  res.json({ message: 'Travelmithra backend running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

app.get('/api/admin/customers', async (req, res) => {
  const username = req.headers['x-admin-username'];
  const password = req.headers['x-admin-password'];
  if (username !== (process.env.ADMIN_USERNAME?.trim() || 'admin') || password !== (process.env.ADMIN_PASSWORD?.trim() || 'admin123')) return res.status(401).json({ error: 'Admin credentials required' });
  const result = await queryDatabase('SELECT id, name, email, phone, password, trips, joined, active FROM admin_customers ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/admin/customers', async (req, res) => {
  const username = req.headers['x-admin-username'];
  const password = req.headers['x-admin-password'];
  if (username !== (process.env.ADMIN_USERNAME?.trim() || 'admin') || password !== (process.env.ADMIN_PASSWORD?.trim() || 'admin123')) return res.status(401).json({ error: 'Admin credentials required' });
  const { name, email, phone, password: customerPassword } = req.body;
  if (!name || !email || !phone) return res.status(400).json({ error: 'Name, email, and phone are required' });
  const result = await queryDatabase('INSERT INTO admin_customers (name, email, phone, password, joined) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, password, trips, joined, active', [name, email, phone, customerPassword || null, new Date().toLocaleDateString('en-IN')]);
  res.status(201).json(result.rows[0]);
});

function isAdminRequest(req: express.Request) {
  return req.headers['x-admin-username'] === (process.env.ADMIN_USERNAME?.trim() || 'admin') && req.headers['x-admin-password'] === (process.env.ADMIN_PASSWORD?.trim() || 'admin123');
}

app.get('/api/admin/bookings', async (req, res) => {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin credentials required' });
  const result = await queryDatabase('SELECT id, customer, route, date, amount, received, previous, adults, kids, executive, active, payment_mode AS "paymentMode", remarks FROM bookings ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/admin/bookings', async (req, res) => {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin credentials required' });
  const b = req.body;
  if (!b.customer || !b.route || !b.date || !b.executive) return res.status(400).json({ error: 'Customer, route, date, and executive are required' });
  const id = b.id || `TM-${Date.now()}`;
  const result = await queryDatabase('INSERT INTO bookings (id, customer, route, date, amount, received, previous, adults, kids, executive, active, payment_mode, remarks) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO UPDATE SET customer=EXCLUDED.customer, route=EXCLUDED.route, date=EXCLUDED.date, amount=EXCLUDED.amount, received=EXCLUDED.received, previous=EXCLUDED.previous, adults=EXCLUDED.adults, kids=EXCLUDED.kids, executive=EXCLUDED.executive, active=EXCLUDED.active, payment_mode=EXCLUDED.payment_mode, remarks=EXCLUDED.remarks RETURNING id, customer, route, date, amount, received, previous, adults, kids, executive, active, payment_mode AS "paymentMode", remarks', [id,b.customer,b.route,b.date,b.amount||0,b.received||0,b.previous||0,b.adults||1,b.kids||0,b.executive,b.active ?? true,b.paymentMode||'BANK TRANSFER',b.remarks||'']);
  res.status(201).json(result.rows[0]);
});

app.delete('/api/admin/bookings/:id', async (req, res) => {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin credentials required' });
  const result = await queryDatabase('DELETE FROM bookings WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Booking not found' });
  res.json({ id: result.rows[0].id });
});

app.get('/api/admin/rewards', async (req, res) => {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin credentials required' });
  const result = await queryDatabase('SELECT id, agent, traveler, booking_id AS "bookingId", amount, note, status, created_at AS "createdAt" FROM rewards ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/admin/rewards', async (req, res) => {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin credentials required' });
  const { agent, traveler, bookingId, amount, note } = req.body;
  if (!agent || !traveler || Number(amount) <= 0) return res.status(400).json({ error: 'Agent, traveler, and a positive reward amount are required' });
  const result = await queryDatabase('INSERT INTO rewards (agent, traveler, booking_id, amount, note) VALUES ($1,$2,$3,$4,$5) RETURNING id, agent, traveler, booking_id AS "bookingId", amount, note, status, created_at AS "createdAt"', [agent, traveler, bookingId || null, Number(amount), note || '']);
  res.status(201).json(result.rows[0]);
});

app.patch('/api/admin/rewards/:id', async (req, res) => {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin credentials required' });
  const status = req.body.status === 'archived' ? 'archived' : null;
  if (!status) return res.status(400).json({ error: 'Invalid reward status' });
  const result = await queryDatabase('UPDATE rewards SET status = $1 WHERE id = $2 RETURNING id, status', [status, req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Reward not found' });
  res.json(result.rows[0]);
});

app.get('/api/community', async (req, res) => {
  try {
    const result = await queryDatabase('SELECT * FROM community_stats LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch community data' });
  }
});

app.get('/api/features', async (req, res) => {
  try {
    const result = await queryDatabase('SELECT id, name, description FROM features');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch feature data' });
  }
});

app.get('/api/support', async (req, res) => {
  try {
    const result = await queryDatabase(
      'SELECT email, phone, hours, faq_count AS "faqCount", ticket_resolution_time AS "ticketResolutionTime" FROM support_info LIMIT 1'
    );
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch support data' });
  }
});

app.get('/api/community/stories', async (req, res) => {
  try {
    const result = await queryDatabase('SELECT * FROM stories ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch stories' });
  }
});

app.post('/api/community/stories', async (req, res) => {
  const { title, content, author } = req.body;
  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Title, content, and author are required' });
  }

  try {
    const result = await queryDatabase('INSERT INTO stories (title, content, author) VALUES ($1, $2, $3) RETURNING id', [
      title,
      content,
      author,
    ]);
    res.status(201).json({ id: result.rows[0].id, message: 'Story posted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to save story' });
  }
});

app.get('/api/community/tips', async (req, res) => {
  try {
    const result = await queryDatabase('SELECT * FROM tips ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch tips' });
  }
});

app.post('/api/community/tips', async (req, res) => {
  const { title, content, author } = req.body;
  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Title, content, and author are required' });
  }

  try {
    const result = await queryDatabase('INSERT INTO tips (title, content, author) VALUES ($1, $2, $3) RETURNING id', [
      title,
      content,
      author,
    ]);
    res.status(201).json({ id: result.rows[0].id, message: 'Tip posted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to save tip' });
  }
});

app.get('/api/support/tickets', async (req, res) => {
  try {
    const result = await queryDatabase('SELECT * FROM support_tickets ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch support tickets' });
  }
});

app.post('/api/support/ticket', async (req, res) => {
  const { subject, description, email } = req.body;
  if (!subject || !description || !email) {
    return res.status(400).json({ error: 'Subject, description, and email are required' });
  }

  try {
    const result = await queryDatabase(
      'INSERT INTO support_tickets (subject, description, email) VALUES ($1, $2, $3) RETURNING id',
      [subject, description, email]
    );
    res.status(201).json({ ticketId: result.rows[0].id, message: 'Support ticket created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create ticket' });
  }
});

app.use(errorHandler);

function listenWithFallback(portNumber: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = app.listen(portNumber, () => {
      resolve(portNumber);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE' && portNumber < 65535) {
        console.warn(`Port ${portNumber} is busy, trying ${portNumber + 1}...`);
        server.close(() => {
          listenWithFallback(portNumber + 1).then(resolve).catch(reject);
        });
        return;
      }

      reject(error);
    });
  });
}

async function startServer() {
  try {
    try {
      await initializeDatabase();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Database unavailable. Starting API in local development mode; database-backed features may be unavailable.');
        console.warn(error instanceof Error ? error.message : error);
      } else {
        throw error;
      }
    }
    const listeningPort = await listenWithFallback(port);
    console.log(`Server running on http://localhost:${listeningPort}`);
  } catch (error) {
    console.error('Backend startup failed. Fix the database configuration and try again.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

startServer();

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
// Booking/customer reads must never be served from a browser, proxy, or CDN cache.
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});



app.get('/', (req, res) => {
  res.json({ message: 'Travelmithra backend running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);




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
    // Do not start an apparently healthy API when PostgreSQL is unavailable.
    // Otherwise the frontend can report a successful-looking session update,
    // then lose all records on refresh because reads come from no database.
    await initializeDatabase();
    const listeningPort = await listenWithFallback(port);
    console.log(`Server running on http://localhost:${listeningPort}`);
  } catch (error) {
    console.error('Backend startup failed. Fix the database configuration and try again.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

startServer();

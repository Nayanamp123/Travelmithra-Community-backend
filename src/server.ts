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

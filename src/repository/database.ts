import dotenv from 'dotenv';
import crypto from 'crypto';
import pkg from 'pg';
import type { QueryResult } from 'pg';

dotenv.config();

const { Pool } = pkg;

function validateDatabaseUrl(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing. Add it to backend/.env before starting the server.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection string.');
  }

  const usesPlaceholderCredentials =
    parsedUrl.username === 'user' ||
    parsedUrl.username === 'your_user' ||
    parsedUrl.password === 'password' ||
    parsedUrl.password === 'your_password';

  if (usesPlaceholderCredentials) {
    throw new Error(
      'DATABASE_URL still contains placeholder credentials. Update backend/.env with your real PostgreSQL username and password.'
    );
  }
}

const databaseUrl = process.env.DATABASE_URL;
validateDatabaseUrl(databaseUrl);

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export async function queryDatabase<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

async function ensureReferralCodes(): Promise<void> {
  const existing = await queryDatabase<{ id: number; referral_code: string | null }>(
    'SELECT id, referral_code FROM users'
  );

  for (const row of existing.rows) {
    if (!row.referral_code) {
      let code = generateReferralCode();
      let unique = false;

      while (!unique) {
        const result = await queryDatabase('SELECT id FROM users WHERE referral_code = $1', [code]);
        if (result.rows.length === 0) {
          unique = true;
        } else {
          code = generateReferralCode();
        }
      }

      await queryDatabase('UPDATE users SET referral_code = $1 WHERE id = $2', [code, row.id]);
    }
  }
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex');
}

export async function initializeDatabase(): Promise<void> {
  await queryDatabase(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar TEXT,
        referral_code VARCHAR(50),
        referred_by INTEGER,
        role VARCHAR(50) DEFAULT 'member',
        sales_executive VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  await queryDatabase('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50)');
  await queryDatabase('ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER');
  await queryDatabase("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member'");
  await queryDatabase("ALTER TABLE users ADD COLUMN IF NOT EXISTS sales_executive VARCHAR(50)");
  await queryDatabase("UPDATE users SET role = 'member' WHERE role IS NULL");
  await ensureReferralCodes();
  await queryDatabase('ALTER TABLE users ALTER COLUMN referral_code SET NOT NULL');
  await queryDatabase('CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_unique ON users(referral_code)');
  await queryDatabase(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_referred_by_fkey'
      ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES users(id);
      END IF;
    END $$;
  `);

  await queryDatabase(`
      CREATE TABLE IF NOT EXISTS community_stats (
       id SERIAL PRIMARY KEY,
       total_users INT DEFAULT 0,
       total_refferals INT DEFAULT 0,
       total_stories INT DEFAULT 0,
       total_tips INT DEFAULT 0,
       total_support_tickets INT DEFAULT 0,
       total_resolved_tickets INT DEFAULT 0,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       
      )
    `);

  await queryDatabase(`
      CREATE TABLE IF NOT EXISTS features (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        description TEXT
      )
    `);

  await queryDatabase(`
      CREATE TABLE IF NOT EXISTS support_info (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        phone VARCHAR(20),
        hours TEXT,
        faq_count INT,
        ticket_resolution_time TEXT
      )
    `);

  await queryDatabase(`
      CREATE TABLE IF NOT EXISTS stories (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        content TEXT,
        author VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  await queryDatabase(`
      CREATE TABLE IF NOT EXISTS tips (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        content TEXT,
        author VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  await queryDatabase(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        subject VARCHAR(255),
        description TEXT,
        email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  await queryDatabase(`
      CREATE TABLE IF NOT EXISTS admin_customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50) NOT NULL,
        password VARCHAR(255),
        trips INT DEFAULT 0,
        joined VARCHAR(100),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  await queryDatabase(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(50) PRIMARY KEY,
        customer VARCHAR(255) NOT NULL,
        route VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        received NUMERIC NOT NULL DEFAULT 0,
        previous NUMERIC NOT NULL DEFAULT 0,
        adults INT NOT NULL DEFAULT 1,
        kids INT NOT NULL DEFAULT 0,
        executive VARCHAR(100) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        payment_mode VARCHAR(50) NOT NULL,
        remarks TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer VARCHAR(255) NOT NULL DEFAULT ''
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS route VARCHAR(255) NOT NULL DEFAULT ''
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS received NUMERIC NOT NULL DEFAULT 0
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS previous NUMERIC NOT NULL DEFAULT 0
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS adults INT NOT NULL DEFAULT 1
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS kids INT NOT NULL DEFAULT 0
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS executive VARCHAR(100) NOT NULL DEFAULT ''
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) NOT NULL DEFAULT 'BANK TRANSFER'
    `);
  await queryDatabase(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT ''
    `);

  await queryDatabase(`
      CREATE TABLE IF NOT EXISTS rewards (
        id SERIAL PRIMARY KEY,
        agent VARCHAR(255) NOT NULL,
        traveler VARCHAR(255) NOT NULL,
        booking_id VARCHAR(50),
        amount NUMERIC NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        status VARCHAR(50) NOT NULL DEFAULT 'issued',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
}

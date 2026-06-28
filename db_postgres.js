import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Pool Connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/newchatbot',
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database successfully.');
});

pool.on('error', (err) => {
  console.error('PostgreSQL unexpected error on idle client:', err);
});

// Helper to initialize tables
export async function initializeDatabase() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createChatsTable = `
    CREATE TABLE IF NOT EXISTS chats (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(50) PRIMARY KEY,
      chat_id VARCHAR(50) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai')),
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createUsersTable);
    await pool.query(createChatsTable);
    await pool.query(createMessagesTable);
    console.log('PostgreSQL tables verified/created successfully.');
  } catch (err) {
    console.error('Error creating PostgreSQL tables:', err);
  }
}

// Auto-initialize tables on startup
initializeDatabase();

// DB Access Methods mirroring db.js

export async function getUsers() {
  const res = await pool.query('SELECT id, name, email, password, created_at AS "createdAt" FROM users');
  return res.rows;
}

export async function saveUser(userData) {
  const id = userData._id || 'usr_' + Math.random().toString(36).substring(2, 11);
  const { name, email, password } = userData;
  const res = await pool.query(
    'INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4) RETURNING id AS "_id", name, email, password, created_at AS "createdAt"',
    [id, name, email.toLowerCase(), password]
  );
  return res.rows[0];
}

export async function findUserByEmail(email) {
  const res = await pool.query(
    'SELECT id AS "_id", name, email, password, created_at AS "createdAt" FROM users WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return res.rows[0] || null;
}

export async function getChats(userId) {
  const res = await pool.query(
    'SELECT id, user_id AS "userId", title, created_at AS "createdAt" FROM chats WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return res.rows;
}

export async function createChat(userId, title) {
  const id = 'chat_' + Math.random().toString(36).substring(2, 11);
  const chatTitle = title || 'New Chat';
  const res = await pool.query(
    'INSERT INTO chats (id, user_id, title) VALUES ($1, $2, $3) RETURNING id, user_id AS "userId", title, created_at AS "createdAt"',
    [id, userId, chatTitle]
  );
  return res.rows[0];
}

export async function deleteChat(userId, chatId) {
  // Cascading deletes in SQL tables will automatically clean up referencing messages,
  // but we can execute it explicitly or let the database handle it.
  await pool.query('DELETE FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
  return true;
}

export async function getMessages(chatId) {
  const res = await pool.query(
    'SELECT id, chat_id AS "chatId", sender, text, created_at AS "createdAt" FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
    [chatId]
  );
  return res.rows;
}

export async function addMessage(chatId, message) {
  const id = 'msg_' + Math.random().toString(36).substring(2, 11);
  const res = await pool.query(
    'INSERT INTO messages (id, chat_id, sender, text) VALUES ($1, $2, $3, $4) RETURNING id, chat_id AS "chatId", sender, text, created_at AS "createdAt"',
    [id, chatId, message.sender, message.text]
  );
  return res.rows[0];
}

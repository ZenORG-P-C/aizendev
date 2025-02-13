import { neon } from '@neondatabase/serverless';
import { Session } from '../types.ts';

// Import and configure dotenv
import dotenv from 'dotenv';
dotenv.config({ path: '././.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be a Neon postgres connection string');
}

const sql = neon(process.env.DATABASE_URL); // Create the Neon client
console.log('DATABASE_URL:', process.env.DATABASE_URL);

// Create a query function
const query = async (queryString: string, values?: unknown[]) => {
  console.log('Executing query:', queryString, 'with values:', values ?? 'none');

  try {
    const result = values && values.length > 0 ? await sql(queryString, values) : await sql(queryString);

    console.log('Query result:', result); // Debugging output
    return result; // Ensure we're returning the correct data format
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Initialize tables function
const initializeTables = async () => {
  try {
    // Check if tables exist first
    const tablesExist: { has_sessions: boolean; has_chats: boolean } = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'chat_sessions'
      ) as has_sessions,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'chats'
      ) as has_chats;
    `);

    // Only create tables if they don't exist
    if (!tablesExist.has_sessions) {
      // Create chat_sessions table
      await query(`
        CREATE TABLE chat_sessions (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          name TEXT NOT NULL
        );
      `);
    }

    if (!tablesExist.has_chats) {
      // Create chats table with session_id
      await query(`
        CREATE TABLE chats (
          id SERIAL PRIMARY KEY,
          session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
          messages TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    console.log('Database tables verified/initialized successfully');
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
};

// Function to get all sessions with proper typing
const getSessions = async (): Promise<Session[]> => {
  try {
    const result = await query(`
      SELECT 
        cs.id,
        cs.name,
        cs.created_at,
        COUNT(c.id)::text as message_count,
        MAX(c.created_at) as last_message_at
      FROM chat_sessions cs
      LEFT JOIN chats c ON cs.id = c.session_id
      GROUP BY cs.id, cs.name, cs.created_at
      ORDER BY MAX(c.created_at) DESC NULLS LAST
    `);
    
    // Type assertion and transformation with proper typing
    return (Array.isArray(result) ? result : []).map((row: Record<string, unknown>): Session => ({
      id: Number(row.id),
      created_at: row.created_at as string,
      name: row.name as string,
      message_count: parseInt(row.message_count as string) || 0,
      last_message_at: row.last_message_at as string || row.created_at as string
    }));
  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
};

// Function to create new session with proper typing
const createSession = async (): Promise<Session> => {
  const name = `Chat ${new Date().toLocaleString()}`;
  try {
    const result = await query(
      'INSERT INTO chat_sessions (name) VALUES ($1) RETURNING *',
      [name]
    );
    const session = Array.isArray(result) ? result[0] : result;
    return {
      id: session.id,
      created_at: session.created_at,
      name: session.name,
      message_count: 0,
      last_message_at: session.created_at
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

// Export the new functions
export { query, initializeTables, getSessions, createSession }; 
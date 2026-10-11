import pool from '../db';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export type PublicUser = Omit<User, 'password_hash'>;

export const userModel = {
  async create(email: string, passwordHash: string): Promise<PublicUser> {
    const result = await pool.query<PublicUser>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, passwordHash]
    );
    return result.rows[0];
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] ?? null;
  },

  async findById(id: string): Promise<PublicUser | null> {
    const result = await pool.query<PublicUser>(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },
};
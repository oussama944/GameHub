import pool from '../db';

export interface Quiz {
  id: number;
  title: string;
  description: string | null;
  created_at: Date;
}

export const createQuizTable = async (): Promise<void> => {
  const query = `
    CREATE TABLE IF NOT EXISTS quizzes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await pool.query(query);
};

export const getAllQuizzes = async (): Promise<Quiz[]> => {
  const result = await pool.query<Quiz>('SELECT * FROM quizzes ORDER BY created_at DESC');
  return result.rows;
};

export const getQuizById = async (id: number): Promise<Quiz | undefined> => {
  const result = await pool.query<Quiz>('SELECT * FROM quizzes WHERE id = $1', [id]);
  return result.rows[0];
};

export const createQuiz = async (title: string, description: string | null): Promise<Quiz> => {
  const result = await pool.query<Quiz>(
    'INSERT INTO quizzes (title, description) VALUES ($1, $2) RETURNING *',
    [title, description]
  );
  return result.rows[0];
};

export const updateQuiz = async (
  id: number,
  title: string,
  description: string | null
): Promise<Quiz | undefined> => {
  const result = await pool.query<Quiz>(
    'UPDATE quizzes SET title = $1, description = $2 WHERE id = $3 RETURNING *',
    [title, description, id]
  );
  return result.rows[0];
};

export const deleteQuiz = async (id: number): Promise<Quiz | undefined> => {
  const result = await pool.query<Quiz>('DELETE FROM quizzes WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};
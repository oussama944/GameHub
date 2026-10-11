import pool from '../db';

export interface Story {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface StoryChoice {
  id: string;
  story_id: string;
  text: string;
  next_story_id: string | null;
  position: number;
}

export interface StoryWithChoices extends Story {
  choices: StoryChoice[];
}

export interface StoryChoiceInput {
  text: string;
  nextStoryId?: string | null;
}

export interface CreateStoryInput {
  title: string;
  content: string;
  authorId: string;
  choices?: StoryChoiceInput[];
}

export const storyModel = {
  async list(): Promise<Story[]> {
    const result = await pool.query<Story>('SELECT * FROM stories ORDER BY created_at DESC');
    return result.rows;
  },

  async findById(id: string): Promise<StoryWithChoices | null> {
    const storyRes = await pool.query<Story>('SELECT * FROM stories WHERE id = $1', [id]);
    const story = storyRes.rows[0];
    if (!story) return null;

    const choicesRes = await pool.query<StoryChoice>(
      'SELECT * FROM story_choices WHERE story_id = $1 ORDER BY position ASC',
      [id]
    );

    return { ...story, choices: choicesRes.rows };
  },

  async create(input: CreateStoryInput): Promise<Story> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const storyRes = await client.query<Story>(
        `INSERT INTO stories (title, content, author_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [input.title, input.content, input.authorId]
      );
      const story = storyRes.rows[0];

      const choices = input.choices ?? [];
      for (let i = 0; i < choices.length; i++) {
        await client.query(
          `INSERT INTO story_choices (story_id, text, next_story_id, position)
           VALUES ($1, $2, $3, $4)`,
          [story.id, choices[i].text, choices[i].nextStoryId ?? null, i]
        );
      }

      await client.query('COMMIT');
      return story;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id: string, input: CreateStoryInput): Promise<Story | 'forbidden' | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<{ author_id: string }>(
        'SELECT author_id FROM stories WHERE id = $1',
        [id]
      );
      if (!existing.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      if (existing.rows[0].author_id !== input.authorId) {
        await client.query('ROLLBACK');
        return 'forbidden';
      }

      const updated = await client.query<Story>(
        `UPDATE stories
         SET title = $1, content = $2, updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [input.title, input.content, id]
      );

      await client.query('DELETE FROM story_choices WHERE story_id = $1', [id]);

      const choices = input.choices ?? [];
      for (let i = 0; i < choices.length; i++) {
        await client.query(
          `INSERT INTO story_choices (story_id, text, next_story_id, position)
           VALUES ($1, $2, $3, $4)`,
          [id, choices[i].text, choices[i].nextStoryId ?? null, i]
        );
      }

      await client.query('COMMIT');
      return updated.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async remove(id: string, authorId: string): Promise<'ok' | 'not_found' | 'forbidden'> {
    const existing = await pool.query<{ author_id: string }>(
      'SELECT author_id FROM stories WHERE id = $1',
      [id]
    );
    if (!existing.rows[0]) return 'not_found';
    if (existing.rows[0].author_id !== authorId) return 'forbidden';

    await pool.query('DELETE FROM stories WHERE id = $1', [id]);
    return 'ok';
  },
};
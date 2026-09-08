import { describe, it, expect, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import * as quizModel from '../src/models/quizModel';

// Mock du module
jest.mock('../src/models/quizModel');

// Récupération des fonctions mockées avec le bon typage
const mockedGetAllQuizzes = jest.mocked(quizModel.getAllQuizzes);
const mockedCreateQuiz = jest.mocked(quizModel.createQuiz);

describe('Quiz API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/quizzes returns list of quizzes', async () => {
    mockedGetAllQuizzes.mockResolvedValue([
      { id: 1, title: 'Test Quiz', description: 'Desc', created_at: new Date() },
    ]);
    const res = await request(app).get('/api/quizzes');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Test Quiz');
  });

  it('POST /api/quizzes creates a quiz', async () => {
    const newQuiz = { id: 2, title: 'New Quiz', description: 'New desc', created_at: new Date() };
    mockedCreateQuiz.mockResolvedValue(newQuiz);
    const res = await request(app)
      .post('/api/quizzes')
      .send({ title: 'New Quiz', description: 'New desc' });
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('New Quiz');
  });

  it('POST /api/quizzes fails without title', async () => {
    const res = await request(app).post('/api/quizzes').send({ description: 'No title' });
    expect(res.statusCode).toBe(400);
  });
});
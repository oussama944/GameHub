import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { storyModel } from '../src/models/storyModel';
import { signToken } from '../src/utils/jwt';

jest.mock('../src/models/storyModel');

const mockedStoryModel = jest.mocked(storyModel);

const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_ID = '22222222-2222-2222-2222-222222222222';
const token = signToken({ sub: USER_ID, email: 'test@example.com' });

const sampleStory = {
  id: 's-1',
  title: 'Le début',
  content: 'Il était une fois...',
  author_id: USER_ID,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('Story Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/stories renvoie la liste', async () => {
    mockedStoryModel.list.mockResolvedValue([sampleStory]);
    const res = await request(app).get('/api/stories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('GET /api/stories/:id renvoie une histoire avec ses choix', async () => {
    mockedStoryModel.findById.mockResolvedValue({
      ...sampleStory,
      choices: [
        { id: 'c-1', story_id: 's-1', text: 'Aller à gauche', next_story_id: null, position: 0 },
      ],
    });
    const res = await request(app).get('/api/stories/s-1');
    expect(res.status).toBe(200);
    expect(res.body.choices).toHaveLength(1);
  });

  it('GET /api/stories/:id renvoie 404 si inexistante', async () => {
    mockedStoryModel.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/stories/unknown');
    expect(res.status).toBe(404);
  });

  it('POST /api/stories refuse sans token', async () => {
    const res = await request(app)
      .post('/api/stories')
      .send({ title: 'T', content: 'C' });
    expect(res.status).toBe(401);
  });

  it('POST /api/stories crée une histoire', async () => {
    mockedStoryModel.create.mockResolvedValue(sampleStory);
    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Le début',
        content: 'Il était une fois...',
        choices: [{ text: 'Aller à gauche' }],
      });
    expect(res.status).toBe(201);
    expect(mockedStoryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Le début', authorId: USER_ID })
    );
  });

  it('POST /api/stories refuse un titre vide', async () => {
    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', content: 'C' });
    expect(res.status).toBe(400);
  });

  it('PUT /api/stories/:id renvoie 403 si non-auteur', async () => {
    mockedStoryModel.update.mockResolvedValue('forbidden');
    const res = await request(app)
      .put('/api/stories/s-1')
      .set('Authorization', `Bearer ${signToken({ sub: OTHER_ID, email: 'other@x.com' })}`)
      .send({ title: 'T', content: 'C' });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/stories/:id renvoie 204 si succès', async () => {
    mockedStoryModel.remove.mockResolvedValue('ok');
    const res = await request(app)
      .delete('/api/stories/s-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});
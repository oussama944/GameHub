import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { userModel } from '../src/models/userModel';

jest.mock('../src/models/userModel');

const mockedUserModel = jest.mocked(userModel);

describe('Auth Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        it('crée un utilisateur et retourne un token', async () => {
            mockedUserModel.create.mockResolvedValue({
                id: 'uuid-1',
                email: 'test@example.com',
                created_at: new Date(),
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(201);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe('test@example.com');
            expect(mockedUserModel.create).toHaveBeenCalledTimes(1);
        });

        it('retourne 400 si email manquant', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ password: 'password123' });

            expect(res.status).toBe(400);
            expect(mockedUserModel.create).not.toHaveBeenCalled();
        });

        it('retourne 400 si mot de passe trop court', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'a@b.com', password: '123' });

            expect(res.status).toBe(400);
        });

        it('retourne 409 si email déjà utilisé', async () => {
            mockedUserModel.create.mockRejectedValue({ code: '23505' });

            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'a@b.com', password: 'password123' });

            expect(res.status).toBe(409);
        });
    });

    describe('POST /api/auth/login', () => {
        it('retourne un token si identifiants valides', async () => {
            const hash = await bcrypt.hash('password123', 4);
            mockedUserModel.findByEmail.mockResolvedValue({
                id: 'uuid-1',
                email: 'test@example.com',
                password_hash: hash,
                created_at: new Date(),
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });

        it('retourne 401 si mot de passe incorrect', async () => {
            const hash = await bcrypt.hash('correct', 4);
            mockedUserModel.findByEmail.mockResolvedValue({
                id: 'uuid-1',
                email: 'test@example.com',
                password_hash: hash,
                created_at: new Date(),
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrong' });

            expect(res.status).toBe(401);
        });

        it('retourne 401 si email inconnu', async () => {
            mockedUserModel.findByEmail.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nope@b.com', password: 'whatever' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/auth/me', () => {
        it('retourne 401 sans token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
        });

        it('retourne le user avec un token valide', async () => {
            mockedUserModel.create.mockResolvedValue({
                id: 'uuid-1',
                email: 'test@example.com',
                created_at: new Date(),
            });

            const reg = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@example.com', password: 'password123' });

            mockedUserModel.findById.mockResolvedValue({
                id: 'uuid-1',
                email: 'test@example.com',
                created_at: new Date(),
            });

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${reg.body.token}`);

            expect(res.status).toBe(200);
            expect(res.body.email).toBe('test@example.com');
        });
    });
});
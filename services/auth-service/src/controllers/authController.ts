import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { userModel } from '../models/userModel';
import { signToken } from '../utils/jwt';

const MIN_PASSWORD_LENGTH = 6;

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await userModel.create(email, passwordHash);
      const token = signToken({ sub: user.id, email: user.email });
      res.status(201).json({ user, token });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === '23505') {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }
      console.error('[auth] register error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({ sub: user.id, email: user.email });
    res.json({ user: { id: user.id, email: user.email }, token });
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await userModel.findById(req.user!.sub);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  },
};
import { Request, Response } from 'express';
import * as quizModel from '../models/quizModel';

// Interface pour le corps des requêtes POST/PUT
interface QuizRequestBody {
  title?: string;
  description?: string;
}

// Helper pour extraire un paramètre d'URL en string
const getParamId = (req: Request): number => {
  const raw = req.params.id;
  const idStr = Array.isArray(raw) ? raw[0] : raw;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    throw new Error('Invalid id parameter');
  }
  return id;
};

export const getAllQuizzes = async (req: Request, res: Response): Promise<void> => {
  try {
    const quizzes = await quizModel.getAllQuizzes();
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getQuizById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req);
    const quiz = await quizModel.getQuizById(id);
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const createQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description } = req.body as QuizRequestBody;
    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'Title is required and must be a string' });
      return;
    }
    const newQuiz = await quizModel.createQuiz(title, description ?? null);
    res.status(201).json(newQuiz);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req);
    const { title, description } = req.body as QuizRequestBody;
    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'Title is required and must be a string' });
      return;
    }
    const updated = await quizModel.updateQuiz(id, title, description ?? null);
    if (!updated) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const deleteQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req);
    const deleted = await quizModel.deleteQuiz(id);
    if (!deleted) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
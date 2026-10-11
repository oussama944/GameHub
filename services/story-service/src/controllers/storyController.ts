import { Request, Response } from 'express';
import { storyModel, StoryChoiceInput } from '../models/storyModel';

const parseChoices = (raw: unknown): StoryChoiceInput[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is { text: string; next_story_id?: string } =>
      !!c && typeof (c as { text?: unknown }).text === 'string'
    )
    .map((c) => ({
      text: c.text.trim(),
      nextStoryId: typeof c.next_story_id === 'string' ? c.next_story_id : null,
    }))
    .filter((c) => c.text.length > 0);
};

export const storyController = {
  async list(_req: Request, res: Response): Promise<void> {
    const stories = await storyModel.list();
    res.json(stories);
  },

  async get(req: Request, res: Response): Promise<void> {
    const story = await storyModel.findById(req.params.id);
    if (!story) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }
    res.json(story);
  },

  async create(req: Request, res: Response): Promise<void> {
    const { title, content, choices } = (req.body ?? {}) as {
      title?: unknown;
      content?: unknown;
      choices?: unknown;
    };

    if (typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const story = await storyModel.create({
      title: title.trim(),
      content: content.trim(),
      authorId: req.user!.sub,
      choices: parseChoices(choices),
    });

    res.status(201).json(story);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { title, content, choices } = (req.body ?? {}) as {
      title?: unknown;
      content?: unknown;
      choices?: unknown;
    };

    if (typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const result = await storyModel.update(req.params.id, {
      title: title.trim(),
      content: content.trim(),
      authorId: req.user!.sub,
      choices: parseChoices(choices),
    });

    if (result === null) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }
    if (result === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.json(result);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const result = await storyModel.remove(req.params.id, req.user!.sub);
    if (result === 'not_found') {
      res.status(404).json({ error: 'Story not found' });
      return;
    }
    if (result === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.status(204).send();
  },
};
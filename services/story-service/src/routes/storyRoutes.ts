import { Router } from 'express';
import { storyController } from '../controllers/storyController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', storyController.list);
router.get('/:id', storyController.get);
router.post('/', authMiddleware, storyController.create);
router.put('/:id', authMiddleware, storyController.update);
router.delete('/:id', authMiddleware, storyController.remove);

export default router;
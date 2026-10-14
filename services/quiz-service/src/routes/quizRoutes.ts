import { Router } from 'express';
import * as quizController from '../controllers/quizController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);
router.post('/', authMiddleware, quizController.createQuiz);
router.put('/:id', authMiddleware, quizController.updateQuiz);
router.delete('/:id', authMiddleware, quizController.deleteQuiz);

export default router;
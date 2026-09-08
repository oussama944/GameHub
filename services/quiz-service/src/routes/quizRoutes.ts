import { Router } from 'express';
import * as quizController from '../controllers/quizController';

const router = Router();

router.get('/', quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);
router.post('/', quizController.createQuiz);
router.put('/:id', quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);

export default router;
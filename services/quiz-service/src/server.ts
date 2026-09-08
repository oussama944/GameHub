import app from './app';
import { createQuizTable } from './models/quizModel';

const port = process.env.PORT || 3000;

const start = async (): Promise<void> => {
  try {
    await createQuizTable();
    console.log('Quiz table ready');
    app.listen(port, () => {
      console.log(`Quiz Service listening on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
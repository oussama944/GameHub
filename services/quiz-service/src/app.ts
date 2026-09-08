import express, { Application } from 'express';
import quizRoutes from './routes/quizRoutes';

const app: Application = express();

app.use(express.json());
app.use('/api/quizzes', quizRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
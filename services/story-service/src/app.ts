import express from 'express';
import cors from 'cors';
import storyRoutes from './routes/storyRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/stories', storyRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
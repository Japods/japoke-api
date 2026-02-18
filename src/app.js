import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { AppError } from './utils/app-error.js';

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://japoke-frontend.onrender.com',
  'https://japoke-admin.onrender.com',
  'https://www.japokebowl.com',
  'https://japokebowl.com',
  'https://admin.japokebowl.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'japoke-api' });
});

app.use('/api', routes);

app.all('/{0,}', (_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

app.use(errorHandler);

export default app;

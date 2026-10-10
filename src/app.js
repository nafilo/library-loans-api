import express from 'express';
import { createLoanModel } from './models/loanModel.js';
import { createLoanRouter } from './routes/loanRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp({ model = createLoanModel() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.get('/', (req, res) => res.json({
    success: true,
    message: 'Library Loans API',
    endpoints: { loans: '/loans', health: '/health' }
  }));
  app.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
  app.use('/loans', createLoanRouter(model));
  app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' }));
  app.use(errorHandler);
  return app;
}

// Entry point yang dideteksi Vercel. Tidak membuka port saat di-import.
export default createApp();

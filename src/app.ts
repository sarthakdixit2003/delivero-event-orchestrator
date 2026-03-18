import express, { type Express, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import eventsRouter from './modules/events/events.router.js';
import { errorMiddleware } from './middleware/index.js';
import tenantsRouter from './modules/tenants/tenants.router.js';
import subscriptionRouter from './modules/subscription/subscription.router.js';

dotenv.config();

const app: Express = express();

app.use(express.json());

const API_V1_PREFIX = '/api/v1';

app.use(`${API_V1_PREFIX}/events`, eventsRouter);
app.use(`${API_V1_PREFIX}/tenants`, tenantsRouter);
app.use(`${API_V1_PREFIX}/subscriptions`, subscriptionRouter);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use(errorMiddleware);

app.listen(Number(process.env.PORT), () => {
  console.log(`Event Orchestrator is running on port ${process.env.PORT}`);
});

import { Router, type Request, type Response } from 'express';

const eventsRouter = Router();

eventsRouter.post('/', (req: Request, res: Response) => {
  res.status(201).json({ message: 'Event created' });
});

export default eventsRouter;

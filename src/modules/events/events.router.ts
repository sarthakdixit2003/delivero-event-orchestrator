import { Router, type NextFunction, type Request, type Response } from 'express';
import { validateAllowedFields } from '@/utils/validator.utils.js';
import { EventsService } from './events.service.js';
import type { CreateEventDto } from './events.dto.js';
import logger from '@/logger/logger.js';

const eventsRouter = Router();

eventsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateAllowedFields(req.body, ['tenant_id', 'event_type', 'source', 'original_payload', 'idempotency_key']);
    logger.info(`Creating event ${JSON.stringify(req.body)}`);
    const event = await new EventsService().createEvent({
      tenant_id: req.body?.tenant_id,
      event_type: req.body?.event_type,
      source: req.body?.source,
      original_payload: req.body?.original_payload,
      idempotency_key: req.body?.idempotency_key,
    } as CreateEventDto);
    logger.info(`Event created ${JSON.stringify(event)}`);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

export default eventsRouter;

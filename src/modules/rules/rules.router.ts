import { validateAllowedFields } from '@/utils/validator.utils.js';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { RulesService } from './rules.service.js';
import logger from '@/logger/logger.js';
import { ValidationError } from '@/errors/validation.error.js';

const rulesRouter = Router();

rulesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info(`Getting rules for tenant ${JSON.stringify(req.query)}`);
    if (!req.query?.tenant_id || typeof req.query?.tenant_id !== 'string') {
      throw new ValidationError('Tenant ID should be a string');
    }
    const rules = await new RulesService().getRules(req.query.tenant_id);
    res.status(200).json(rules);
  } catch (error) {
    next(error);
  }
});

rulesRouter.get('/:rule_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule_id = req.params.rule_id;
    const tenant_id = req.query.tenant_id;
    if (!rule_id || typeof rule_id !== 'string') {
      throw new ValidationError(`Rule should be a number`);
    }
    if (!tenant_id || typeof tenant_id !== 'string') {
      throw new ValidationError('Tenant ID should be a string');
    }

    const rules = await new RulesService().getRules(tenant_id, rule_id);
    res.status(200).json(rules);
  } catch (error) {
    next(error);
  }
});

rulesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info(`Creating rule ${JSON.stringify(req.body)}`);
    validateAllowedFields(req.body, ['tenant_id', 'name', 'description', 'schema', 'transform_template']);
    const rule = await new RulesService().createRule(req.body);
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

rulesRouter.patch('/:rule_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateAllowedFields(req.body, [
      'name',
      'description',
      'schema',
      'transform_template',
      'changes_summary',
      'enabled',
    ]);
    const rule_id = req.params.rule_id;
    const tenant_id = req.query.tenant_id;
    if (!rule_id || typeof rule_id !== 'string') {
      throw new ValidationError(`Rule ID is required`);
    }
    if (!tenant_id || typeof tenant_id !== 'string') {
      throw new ValidationError('Tenant ID should be a string');
    }
    const rule = await new RulesService().updateRule(tenant_id, Number(rule_id), req.body);
    res.status(200).json(rule);
  } catch (error) {
    next(error);
  }
});

rulesRouter.delete('/:rule_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule_id = req.params.rule_id;
    const tenant_id = req.query.tenant_id;
    if (!rule_id || typeof rule_id !== 'string') {
      throw new ValidationError(`Rule ID is required`);
    }
    if (!tenant_id || typeof tenant_id !== 'string') {
      throw new ValidationError('Tenant ID should be a string');
    }
    await new RulesService().deleteRule(tenant_id, Number(rule_id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default rulesRouter;

import { Router, type NextFunction, type Request, type Response } from 'express';
import { createTenantValidator, getTenantByIdValidator, updateTenantValidator } from './tenants.validator.js';
import { TenantsService } from './tenants.service.js';
import type { CreateTenantDto, UpdateTenantDto } from './tenants.dto.js';
import { validateAllowedFields } from '@/utils/validator.utils.js';

const tenantsRouter = Router();

tenantsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    getTenantByIdValidator(req?.params?.id as string);
    const tenant = await new TenantsService().getTenantById(req?.params?.id as string);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    res.status(200).json(tenant);
  } catch (error) {
    next(error);
  }
});

tenantsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = await new TenantsService().getTenants();
    res.status(200).json(tenants);
  } catch (error) {
    next(error);
  }
});

tenantsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    createTenantValidator(req.body);
    const tenant = await new TenantsService().createTenant(req.body as CreateTenantDto);
    res.status(201).json(tenant);
  } catch (error) {
    next(error);
  }
});

tenantsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateAllowedFields(req.body, ['name', 'enabled']);
    updateTenantValidator(req.body);
    const tenant = await new TenantsService().updateTenantById(req?.params?.id as string, req.body as UpdateTenantDto);
    res.status(200).json(tenant);
  } catch (error) {
    next(error);
  }
});

tenantsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    getTenantByIdValidator(req?.params?.id as string);
    await new TenantsService().deleteTenantById(req?.params?.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default tenantsRouter;

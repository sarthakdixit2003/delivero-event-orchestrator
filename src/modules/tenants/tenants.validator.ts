import { ValidationError } from '../../errors/index.js';

export function getTenantByIdValidator(id: string) {
  if (!id || typeof id !== 'string') throw new ValidationError('Id is required and must be a string');
  if (id.length < 36 || id.length > 36) throw new ValidationError('Id must be a valid UUID');
}

export function createTenantValidator(body: any) {
  if (!body.name || typeof body.name !== 'string') throw new ValidationError('Name is required and must be a string');
  if (body.name.length < 3 || body.name.length > 100)
    throw new ValidationError('Name must be between 3 and 100 characters');
}

export function updateTenantValidator(body: any) {
  if (body.name && typeof body.name !== 'string') throw new ValidationError('Name is required and must be a string');
  if ((body.name && body.name.length < 3) || (body.name && body.name.length > 100))
    throw new ValidationError('Name must be between 3 and 100 characters long');
  if (body.enabled && typeof body.enabled !== 'boolean') throw new ValidationError('Enabled must be a boolean');
  if (body.name === undefined && body.enabled === undefined)
    throw new ValidationError('At least one field is required');
}

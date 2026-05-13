import { ValidationError } from '@/errors/validation.error.js';
import { type CreateSubscriptionDto } from './subscription.dto.js';

export const getSubscriptionsByTenantIdValidator = (tenantId: string) => {
  if (!tenantId) {
    throw new ValidationError('Tenant ID is required');
  }
  if (typeof tenantId !== 'string') {
    throw new ValidationError('Tenant ID must be a string');
  }
};

export const getSubscriptionByIdValidator = (id: string, tenantId: string) => {
  if (!id) {
    throw new ValidationError('ID is required');
  }
  if (typeof id !== 'string') {
    throw new ValidationError('ID must be a string');
  }
  if (!tenantId) {
    throw new ValidationError('Tenant ID is required');
  }
  if (typeof tenantId !== 'string') {
    throw new ValidationError('Tenant ID must be a string');
  }
};

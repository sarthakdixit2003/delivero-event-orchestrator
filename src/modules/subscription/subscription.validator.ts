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

export const createSubscriptionValidator = (subscription: CreateSubscriptionDto) => {
  if (!subscription.rule_id) {
    throw new ValidationError('Rule ID is required');
  }
  if (typeof subscription.rule_id !== 'number') {
    throw new ValidationError('Rule ID must be a number');
  }
  if (!subscription.name) {
    throw new ValidationError('Name is required');
  }
  if (typeof subscription.name !== 'string') {
    throw new ValidationError('Name must be a string');
  }
  if (subscription.name.length < 3 || subscription.name.length > 100) {
    throw new ValidationError('Name must be between 3 and 100 characters long');
  }
  if (!subscription.auth_type) {
    throw new ValidationError('Auth type is required');
  }
  if (typeof subscription.auth_type !== 'string') {
    throw new ValidationError('Auth type must be a string');
  }
  if (!subscription.auth_secret_ref) {
    throw new ValidationError('Auth secret ref is required');
  }
  if (typeof subscription.auth_secret_ref !== 'string') {
    throw new ValidationError('Auth secret ref must be a string');
  }
  if (subscription.auth_secret_ref.length < 3 || subscription.auth_secret_ref.length > 100) {
    throw new ValidationError('Auth secret ref must be between 3 and 100 characters long');
  }
  if (subscription?.max_retries_allowed !== undefined && typeof subscription.max_retries_allowed !== 'number') {
    throw new ValidationError('Max retries allowed must be a number');
  }
  if (
    subscription?.max_retries_allowed !== undefined &&
    (subscription.max_retries_allowed < 1 || subscription.max_retries_allowed > 10)
  ) {
    throw new ValidationError('Max retries allowed must be between 1 and 10');
  }
  if (subscription?.concurrency_limit !== undefined && typeof subscription.concurrency_limit !== 'number') {
    throw new ValidationError('Concurrency limit must be a number');
  }
  if (
    subscription?.concurrency_limit !== undefined &&
    (subscription.concurrency_limit < 1 || subscription.concurrency_limit > 10)
  ) {
    throw new ValidationError('Concurrency limit must be between 1 and 10');
  }
  if (subscription.rate_limit_rps && typeof subscription.rate_limit_rps !== 'number') {
    throw new ValidationError('Rate limit RPS must be a number');
  }
  if (
    subscription?.rate_limit_rps !== undefined &&
    (subscription.rate_limit_rps < 1 || subscription.rate_limit_rps > 1000)
  ) {
    throw new ValidationError('Rate limit RPS must be between 1 and 1000');
  }
  if (subscription.enabled !== undefined && typeof subscription.enabled !== 'boolean') {
    throw new ValidationError('Enabled must be a boolean');
  }
  if (!subscription.tenant_id) {
    throw new ValidationError('Tenant ID is required');
  }
  if (typeof subscription.tenant_id !== 'string') {
    throw new ValidationError('Tenant ID must be a string');
  }
  if (!subscription.endpoint_url) {
    throw new ValidationError('Endpoint URL is required');
  }
  if (typeof subscription.endpoint_url !== 'string') {
    throw new ValidationError('Endpoint URL must be a string');
  }
  if (subscription.endpoint_url.length < 3 || subscription.endpoint_url.length > 2048) {
    throw new ValidationError('Endpoint URL must be between 3 and 2048 characters long');
  }
};

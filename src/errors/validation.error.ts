import { BaseError } from './base.error.js';

export class ValidationError extends BaseError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, 400, 'VALIDATION_ERROR', metadata);
  }
}

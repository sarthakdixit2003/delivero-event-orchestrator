import { BaseError } from './base.error.js';

export class ConflictError extends BaseError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, 409, 'CONFLICT_ERROR', metadata);
  }
}

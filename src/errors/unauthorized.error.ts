import { BaseError } from './base.error.js';

export class UnauthorizedError extends BaseError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, 401, 'UNAUTHORIZED_ERROR', metadata);
  }
}

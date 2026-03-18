import { BaseError } from './base.error.js';

export class InternalServerError extends BaseError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', metadata);
  }
}

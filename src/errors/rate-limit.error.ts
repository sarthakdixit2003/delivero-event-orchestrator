import { BaseError } from './base.error.js';

export class RateLimitError extends BaseError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, 429, 'RATE_LIMIT_ERROR', metadata);
  }
}

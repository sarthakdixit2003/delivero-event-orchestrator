import { BaseError } from './base.error.js';

export class ExternalServiceError extends BaseError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', metadata);
  }
}

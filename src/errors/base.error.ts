export class BaseError extends Error {
  public statusCode: number;
  public errorCode: string;
  public metadata: Record<string, any>;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, errorCode: string, metadata: Record<string, any> = {}) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.metadata = metadata;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

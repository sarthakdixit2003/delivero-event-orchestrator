import { ValidationError } from '../errors/index.js';

export function validateAllowedFields(body: any, allowedFields: string[]) {
  const invalidFields = Object.keys(body).filter((key) => !allowedFields.includes(key));

  if (invalidFields.length) {
    throw new ValidationError(`Invalid fields: ${invalidFields.join(', ')}`);
  }
}

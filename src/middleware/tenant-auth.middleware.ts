import pool from '@/db-utils/db.js';
import { InternalServerError, UnauthorizedError } from '@/errors/index.js';
import logger from '@/logger/logger.js';
import type { NextFunction, Request, Response } from 'express';

export async function tenantAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) {
    throw new UnauthorizedError('Unauthorized');
  }
  const client = await pool.connect();
  try {
    const tenant = await client.query(
      `
      SELECT * FROM tenant WHERE id = $1
    `,
      [tenantId],
    );
    if (!tenant.rows[0]) {
      throw new UnauthorizedError('Unauthorized');
    }
    req.tenant_id = tenant.rows[0].id;
  } catch (error) {
    logger.error(error);
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new InternalServerError('Failed to authenticate tenant', { error });
  } finally {
    client.release();
  }
  next();
}

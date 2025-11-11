import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../../../shared/types/auth.types';
import { UserRole } from '../../../domain/entities/User';
import config from '../../../config';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Helper function to set CORS headers
const setCorsHeaders = (res: Response, req: Request) => {
  const allowedOrigins = [
    'https://emprise.prossimatech.com',
    'https://www.emprise.prossimatech.com',
    'https://client.prossimatech.com',
    'http://localhost:5173'
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
};

export function authMiddleware(requiredRoles: UserRole[] = []) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        setCorsHeaders(res, req);
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

      req.user = decoded;

      // Check role if required
      if (requiredRoles.length > 0 && !requiredRoles.includes(decoded.role)) {
        setCorsHeaders(res, req);
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (error) {
      setCorsHeaders(res, req);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  };
}
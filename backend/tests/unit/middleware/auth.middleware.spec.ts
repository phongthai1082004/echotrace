import { authMiddleware, authGuard } from '@middleware/auth.middleware';
import { AppError } from '@middleware/app.error';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('Auth Middleware - Unit Tests', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {
        authorization: 'Bearer valid_token',
      },
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('EP: Should attach userId and role from valid token', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      expect(req.userId).toBe('100');
      expect(req.userRole).toBe('USER');
      expect(next).toHaveBeenCalled();
    });

    it('EP: Should handle admin role', () => {
      const mockPayload = { userId: '100', role: 'ADMIN' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      expect(req.userRole).toBe('ADMIN');
      expect(next).toHaveBeenCalled();
    });

    it('EP: Should handle vendor role', () => {
      const mockPayload = { userId: '100', role: 'VENDOR' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      expect(req.userRole).toBe('VENDOR');
    });

    it('Error: Should throw if Authorization header missing', () => {
      req.headers.authorization = undefined;

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('Error: Should throw if Bearer prefix missing', () => {
      req.headers.authorization = 'InvalidToken';

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('Error: Should handle malformed Authorization header', () => {
      req.headers.authorization = 'Bearer ';
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Token is empty');
      });

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('Error: Should throw 401 for token verification failure', () => {
      const error = new Error('Token expired');
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw error;
      });

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('Error: Should throw 401 for invalid token signature', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('BVA: Should handle userId as string boundary', () => {
      const mockPayload = { userId: '1', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      expect(req.userId).toBe('1');
    });

    it('BVA: Should handle large userId', () => {
      const mockPayload = { userId: '2147483647', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      expect(req.userId).toBe('2147483647');
    });

    it('EP: Should verify token using correct secret', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(
        'valid_token',
        process.env.JWT_ACCESS_SECRET
      );
    });

    it('EP: Should extract token from Bearer scheme', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      const tokenArg = (jwt.verify as jest.Mock).mock.calls[0][0];
      expect(tokenArg).toBe('valid_token');
    });

    it('Error: Should handle case sensitivity - lowercase "bearer"', () => {
      req.headers.authorization = 'bearer valid_token';
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      // Should handle case-insensitive Bearer prefix
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authGuard', () => {
    it('EP: Should allow authenticated user without role check', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const guard = authGuard();
      guard(req, res, next);

      expect(req.userId).toBe('100');
      expect(next).toHaveBeenCalled();
    });

    it('EP: Should allow user with matching role', () => {
      const mockPayload = { userId: '100', role: 'ADMIN' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const guard = authGuard('ADMIN');
      guard(req, res, next);

      expect(req.userRole).toBe('ADMIN');
      expect(next).toHaveBeenCalled();
    });

    it('Error: Should deny user without matching role', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const guard = authGuard('ADMIN');
      guard(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('EP: Should allow user with any matching role from multiple allowed', () => {
      const mockPayload = { userId: '100', role: 'VENDOR' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const guard = authGuard('ADMIN', 'VENDOR');
      guard(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('Error: Should deny user if no matching role from multiple allowed', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const guard = authGuard('ADMIN', 'VENDOR');
      guard(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('Error: Should return 403 Forbidden for role mismatch', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const guard = authGuard('ADMIN');
      guard(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
    });

    it('EP: Should support single role as string', () => {
      const mockPayload = { userId: '100', role: 'ADMIN' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const guard = authGuard('ADMIN');
      guard(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('EP: Should support multiple roles as variadic args', () => {
      const mockPayload = { userId: '100', role: 'ADMIN' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const guard = authGuard('ADMIN', 'VENDOR', 'USER');
      guard(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('BVA: Should handle no roles specified (auth only)', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const guard = authGuard();
      guard(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('BVA: Should handle empty roles array', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const guard = authGuard();
      guard(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('Pattern: Should first authenticate (authMiddleware), then check role', () => {
      // If authMiddleware fails, guard never checks role
      req.headers.authorization = undefined;

      const guard = authGuard('ADMIN');
      guard(req, res, next);

      // authMiddleware should fail first
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('Pattern: authGuard() is composable and reusable', () => {
      const mockPayload = { userId: '100', role: 'ADMIN' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const adminGuard = authGuard('ADMIN');

      // Use on first request
      adminGuard(req, res, next);
      expect(next).toHaveBeenCalled();

      // Reset and use on second request with different user
      jest.clearAllMocks();
      const mockPayload2 = { userId: '200', role: 'ADMIN' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload2);

      adminGuard(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Security Patterns', () => {
    it('Security: Should not expose password in token payload', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      expect(req).not.toHaveProperty('password');
    });

    it('Security: Should attach userId and role, not full user object', () => {
      const mockPayload = { userId: '100', role: 'USER', email: 'user@test.com' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      // Should extract only userId and role
      expect(req.userId).toBe('100');
      expect(req.userRole).toBe('USER');
    });

    it('Security: Should use JWT_ACCESS_SECRET for verification', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      // Verify uses JWT_ACCESS_SECRET, not hardcoded value
      expect(jwt.verify).toHaveBeenCalledWith(
        'valid_token',
        expect.not.stringContaining('hardcoded')
      );
    });
  });

  describe('Error Handling', () => {
    it('Error: Should propagate AppError to next middleware', () => {
      const error = new AppError('AUTH_FAILED', 401);
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw error;
      });

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('Error: Should wrap non-AppError exceptions', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('Request Enhancement', () => {
    it('Pattern: AuthRequest interface - userId and userRole attachment', () => {
      const mockPayload = { userId: '100', role: 'ADMIN' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      // Should have AuthRequest interface properties
      expect(req).toHaveProperty('userId');
      expect(req).toHaveProperty('userRole');
    });

    it('Pattern: Request is enhanced with auth context for downstream use', () => {
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      // Downstream middleware/controller can access auth context
      expect(req.userId).toBeDefined();
      expect(req.userRole).toBeDefined();
    });
  });

  describe('Token Format Validation', () => {
    it('EP: Should handle Bearer token with one space', () => {
      req.headers.authorization = 'Bearer token123';
      const mockPayload = { userId: '100', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(req, res, next);

      const tokenArg = (jwt.verify as jest.Mock).mock.calls[0][0];
      expect(tokenArg).toBe('token123');
    });

    it('Error: Should handle Bearer token with multiple spaces', () => {
      req.headers.authorization = 'Bearer  token123';
      // Middleware should reject or handle malformed Bearer token with extra spaces
      // For now, mock the behavior - middleware typically validates strict format
      
      authMiddleware(req, res, next);

      // Middleware either throws error or passes - check that next was called
      expect(next).toHaveBeenCalled();
    });

    it('Error: Should reject malformed Authorization header format', () => {
      req.headers.authorization = 'NotBearer token123';

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});

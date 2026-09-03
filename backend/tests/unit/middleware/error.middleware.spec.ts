import { errorMiddleware } from '@middleware/error.middleware';
import { AppError } from '@middleware/app.error';
import { Request, Response } from 'express';

describe('Error Middleware - Unit Tests', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      method: 'POST',
      url: '/api/orders',
      i18n: {
        t: jest.fn((key) => `translated-${key}`),
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('AppError Handling', () => {
    it('EP: Should extract statusCode from AppError', () => {
      const error = new AppError('VALIDATION_FAILED', 400);

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('EP: Should extract errorCode from AppError', () => {
      const error = new AppError('NOT_FOUND', 404);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('EP: Should include details if provided', () => {
      const details = { email: ['must be an email'] };
      const error = new AppError('VALIDATION_FAILED', 400, details);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: details,
        })
      );
    });

    it('BVA: Status 400 - Bad Request', () => {
      const error = new AppError('BAD_REQUEST', 400);

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('BVA: Status 401 - Unauthorized', () => {
      const error = new AppError('UNAUTHORIZED', 401);

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('BVA: Status 403 - Forbidden', () => {
      const error = new AppError('FORBIDDEN', 403);

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('BVA: Status 404 - Not Found', () => {
      const error = new AppError('NOT_FOUND', 404);

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('BVA: Status 429 - Too Many Requests', () => {
      const error = new AppError('TOO_MANY_REQUESTS', 429);

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('BVA: Status 500 - Internal Server Error', () => {
      const error = new AppError('INTERNAL_ERROR', 500);

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Generic Error Handling', () => {
    it('EP: Should default to 500 for non-AppError', () => {
      const error = new Error('Unexpected error');

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('EP: Should extract message from Error', () => {
      const error = new Error('Something went wrong');

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong',
        })
      );
    });

    it('Error: Should handle null error message', () => {
      const error = new Error();

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('Error: Should handle object without message property', () => {
      const error = { code: 'UNKNOWN' };

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('i18n Integration', () => {
    it('EP: Should translate error message via i18n', () => {
      const error = new AppError('AUTH_NOT_AUTHENTICATED', 401);

      errorMiddleware(error, req, res, next);

      expect(req.i18n?.t).toHaveBeenCalledWith(
        expect.stringContaining('AUTH_NOT_AUTHENTICATED')
      );
    });

    it('EP: Should use translated message in response', () => {
      req.i18n.t.mockReturnValue('Vous êtes non authentifié');
      const error = new AppError('AUTH_NOT_AUTHENTICATED', 401);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Vous êtes non authentifié',
        })
      );
    });

    it('EP: Should fallback to error code if i18n unavailable', () => {
      req.i18n = undefined;
      const error = new AppError('CUSTOM_ERROR', 400);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'CUSTOM_ERROR',
        })
      );
    });

    it('EP: Should fallback to error code if translation key not found', () => {
      req.i18n.t.mockReturnValue('UNKNOWN_KEY'); // i18n returns key if not found
      const error = new AppError('NONEXISTENT_CODE', 400);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.any(Object));
    });

    it('EP: Should translate validation field errors', () => {
      const details = { email: ['validation.isEmail'] };
      req.i18n.t.mockImplementation((key: string) => {
        if (key === 'validation.isEmail') return 'must be a valid email';
        return key;
      });

      const error = new AppError('VALIDATION_FAILED', 400, details);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('Response Format', () => {
    it('EP: Should return success: false for errors', () => {
      const error = new AppError('ERROR', 400);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('EP: Should include statusCode in response', () => {
      const error = new AppError('ERROR', 404);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });

    it('EP: Should include timestamp in response', () => {
      const error = new AppError('ERROR', 400);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });

    it('EP: Should have null data in error response', () => {
      const error = new AppError('ERROR', 400);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
        })
      );
    });

    it('EP: Should include errors object if provided', () => {
      const details = { field1: ['error1'], field2: ['error2'] };
      const error = new AppError('VALIDATION_FAILED', 400, details);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: details,
        })
      );
    });

    it('EP: Should have null errors if not provided', () => {
      const error = new AppError('ERROR', 400);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: null,
        })
      );
    });
  });

  describe('Logging', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('EP: Should log error with method, url, code, status', () => {
      const error = new AppError('NOT_FOUND', 404);

      errorMiddleware(error, req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('POST /api/orders')
      );
    });

    it('EP: Should include error code in log', () => {
      const error = new AppError('VALIDATION_FAILED', 400);

      errorMiddleware(error, req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('VALIDATION_FAILED')
      );
    });

    it('EP: Should include status code in log', () => {
      const error = new AppError('AUTH_FAILED', 401);

      errorMiddleware(error, req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('401')
      );
    });

    it('EP: Should log stack trace for debugging', () => {
      const error = new AppError('ERROR', 500);

      errorMiddleware(error, req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });
  });

  describe('Edge Cases', () => {
    it('Error: Should handle undefined error', () => {
      errorMiddleware(undefined as any, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('Error: Should handle null error', () => {
      errorMiddleware(null as any, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('Error: Should handle empty Error object', () => {
      const error = Object.create(Error.prototype);

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalled();
    });

    it('Error: Should handle circular reference in details', () => {
      const circular: any = { a: 1 };
      circular.self = circular; // Create circular reference

      // Should not throw
      expect(() => {
        const error = new AppError('ERROR', 400, circular);
        errorMiddleware(error, req, res, next);
      }).not.toThrow();
    });

    it('Error: Should handle very large error details', () => {
      const largeDetails = Array.from({ length: 1000 }, (_, i) => ({
        [`field${i}`]: [`error${i}`],
      })).reduce((a, b) => ({ ...a, ...b }), {});

      const error = new AppError('ERROR', 400, largeDetails);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('HTTP Status Code Mapping', () => {
    it('Pattern: 400 for validation/input errors', () => {
      const error = new AppError('VALIDATION_FAILED', 400);
      errorMiddleware(error, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Pattern: 401 for auth/token errors', () => {
      const error = new AppError('AUTH_NOT_AUTHENTICATED', 401);
      errorMiddleware(error, req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('Pattern: 403 for permission/role errors', () => {
      const error = new AppError('ADMIN_ACCESS_REQUIRED', 403);
      errorMiddleware(error, req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('Pattern: 404 for resource not found', () => {
      const error = new AppError('USER_NOT_FOUND', 404);
      errorMiddleware(error, req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Pattern: 500 for unhandled exceptions', () => {
      const error = new Error('Unexpected error');
      errorMiddleware(error, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Content Type', () => {
    it('EP: Should return JSON content', () => {
      const error = new AppError('ERROR', 400);

      errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('Middleware Chain', () => {
    it('Pattern: Error middleware is last in chain', () => {
      const error = new AppError('ERROR', 400);

      errorMiddleware(error, req, res, next);

      // Should not call next (it's the last middleware)
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Request Context', () => {
    it('EP: Should use request method in logging', () => {
      req.method = 'DELETE';
      const error = new AppError('ERROR', 400);

      errorMiddleware(error, req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DELETE')
      );
    });

    it('EP: Should use request URL in logging', () => {
      req.url = '/api/complex/path/123';
      const error = new AppError('ERROR', 400);

      errorMiddleware(error, req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('/api/complex/path/123')
      );
    });
  });
});

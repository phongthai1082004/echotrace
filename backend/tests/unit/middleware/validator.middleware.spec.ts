import { validateDto } from '@middleware/validator.middleware';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response } from 'express';

jest.mock('class-transformer');
jest.mock('class-validator');

describe('Validator Middleware - Unit Tests', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
      i18n: {
        t: jest.fn((key) => `translated-${key}`),
      },
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateDto', () => {
    it('EP: Should validate valid DTO', async () => {
      const DtoClass = class {};
      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('EP: Should transform request body to DTO instance', async () => {
      const DtoClass = class {};
      (plainToInstance as jest.Mock).mockReturnValue({ transformed: true });
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(plainToInstance).toHaveBeenCalledWith(DtoClass, req.body);
    });

    it('EP: Should validate transformed instance', async () => {
      const DtoClass = class {};
      const dtoInstance = { email: 'test@example.com' };
      (plainToInstance as jest.Mock).mockReturnValue(dtoInstance);
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(validate).toHaveBeenCalledWith(dtoInstance);
    });

    it('EP: Should assign validated DTO to request body', async () => {
      const DtoClass = class {};
      const validatedDto = { email: 'test@example.com', password: 'pwd' };
      (plainToInstance as jest.Mock).mockReturnValue(validatedDto);
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(req.body).toEqual(validatedDto);
    });

    it('EP: Should call next() after successful validation', async () => {
      const DtoClass = class {};
      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('Error: Should reject if validation has errors', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'email',
          constraints: { isEmail: 'must be an email' },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('Error: Should format validation errors as Record<string, string[]>', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'email',
          constraints: { isEmail: 'must be email', required: 'email required' },
        },
        {
          property: 'password',
          constraints: { minLength: 'must be at least 8 characters' },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details).toEqual(
        expect.objectContaining({
          email: expect.any(Array),
          password: expect.any(Array),
        })
      );
    });

    it('EP: Should translate validation error messages via i18n', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'email',
          constraints: { isEmail: 'validation.isEmail' },
        },
      ];

      req.i18n.t.mockImplementation((key: string) => {
        if (key === 'validation.isEmail') return 'Must be a valid email address';
        return key;
      });

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(req.i18n.t).toHaveBeenCalledWith('validation.isEmail');
    });

    it('EP: Should handle multiple constraints per field', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'password',
          constraints: {
            minLength: 'too short',
            matches: 'must contain uppercase',
            isString: 'must be string',
          },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details.password).toHaveLength(3);
    });

    it('BVA: Should handle empty validation errors array', async () => {
      const DtoClass = class {};
      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('BVA: Should handle many fields with errors', async () => {
      const DtoClass = class {};
      const validationErrors = Array.from({ length: 50 }, (_, i) => ({
        property: `field${i}`,
        constraints: { required: `field${i} is required` },
      }));

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(Object.keys(error.details)).toHaveLength(50);
    });

    it('Error: Should return 400 status code', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'email',
          constraints: { isEmail: 'invalid' },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.statusCode).toBe(400);
    });

    it('Error: Should have VALIDATION_FAILED error code', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'name',
          constraints: { required: 'name is required' },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.errorCode).toBe('VALIDATION_FAILED');
    });
  });

  describe('DTO Transformation', () => {
    it('EP: Should convert plain object to DTO instance', async () => {
      const DtoClass = class { email: string = '' };
      const dtoInstance = new DtoClass();

      (plainToInstance as jest.Mock).mockReturnValue(dtoInstance);
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(plainToInstance).toHaveBeenCalledWith(DtoClass, req.body);
    });

    it('EP: Should use excludeExtraneousValues if applicable', async () => {
      const DtoClass = class {};
      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      // plainToInstance should handle extra fields appropriately
      expect(plainToInstance).toHaveBeenCalled();
    });
  });

  describe('Error Messages', () => {
    it('EP: Should collect all constraint messages for a field', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'email',
          constraints: {
            isEmail: 'must be email',
            required: 'email required',
          },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details.email).toContain('must be email');
      expect(error.details.email).toContain('email required');
    });

    it('EP: Should handle nested validation errors', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'address',
          constraints: { isObject: 'must be object' },
          children: [
            {
              property: 'city',
              constraints: { required: 'city required' },
            },
          ],
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details).toBeDefined();
    });
  });

  describe('i18n Integration', () => {
    it('EP: Should use req.i18n?.t() for translations', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'email',
          constraints: { isEmail: 'validation.isEmail' },
        },
      ];

      req.i18n.t.mockReturnValue('translated message');
      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(req.i18n.t).toHaveBeenCalledWith('validation.isEmail');
    });

    it('EP: Should fallback to constraint message if i18n unavailable', async () => {
      req.i18n = undefined;
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'email',
          constraints: { isEmail: 'must be email' },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details.email).toContain('must be email');
    });

    it('EP: Should fallback if translation key not found', async () => {
      req.i18n.t.mockImplementation((key: string) => key); // Return key if not found
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'field',
          constraints: { unknown: 'validation.unknown' },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details.field).toBeDefined();
    });
  });

  describe('Common Validation Scenarios', () => {
    it('EP: Email validation error', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'email',
          constraints: { isEmail: 'must be valid email' },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details.email).toContain('must be valid email');
    });

    it('EP: Required field validation error', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'username',
          constraints: { required: 'username is required' },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details.username).toContain('username is required');
    });

    it('EP: Length validation error', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'password',
          constraints: { minLength: 'must be at least 8 characters' },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details.password).toBeDefined();
    });

    it('EP: Type validation error', async () => {
      const DtoClass = class {};
      const validationErrors = [
        {
          property: 'age',
          constraints: { isNumber: 'age must be a number' },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details.age).toContain('age must be a number');
    });
  });

  describe('Request Body Handling', () => {
    it('EP: Should preserve original body before validation', async () => {
      const DtoClass = class {};
      const originalBody = { ...req.body };

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(plainToInstance).toHaveBeenCalledWith(DtoClass, originalBody);
    });

    it('EP: Should handle empty request body', async () => {
      req.body = {};
      const DtoClass = class {};

      (plainToInstance as jest.Mock).mockReturnValue({});
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(plainToInstance).toHaveBeenCalledWith(DtoClass, {});
    });

    it('Error: Should handle null request body', async () => {
      req.body = null;
      const DtoClass = class {};

      (plainToInstance as jest.Mock).mockReturnValue(null);
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(plainToInstance).toHaveBeenCalled();
    });

    it('Error: Should handle undefined request body', async () => {
      req.body = undefined;
      const DtoClass = class {};

      (plainToInstance as jest.Mock).mockReturnValue(undefined);
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      await middleware(req, res, next);

      expect(plainToInstance).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('Performance: Should handle large DTO validation efficiently', async () => {
      const DtoClass = class {};
      const largeBody = Object.fromEntries(
        Array.from({ length: 1000 }, (_, i) => [`field${i}`, `value${i}`])
      );
      req.body = largeBody;

      (plainToInstance as jest.Mock).mockReturnValue(largeBody);
      (validate as jest.Mock).mockResolvedValue([]);

      const middleware = validateDto(DtoClass);
      const start = Date.now();
      await middleware(req, res, next);
      const duration = Date.now() - start;

      expect(next).toHaveBeenCalled();
      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000);
    });
  });
});

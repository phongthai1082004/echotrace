import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './app.error.js';
import { ErrorCode } from '@echotrace/shared';

export function validateDto(dtoClass: any) {
	return async (req: Request, res: Response, next: NextFunction) => {
		const dtoObj = plainToInstance(dtoClass, req.body);

		const errors: ValidationError[] = await validate(dtoObj);

		if (errors.length > 0) {
			const formattedErrors: Record<string, string[]> = {};
			const t = (req as any).i18n?.t;

			errors.forEach((err) => {
				if (err.constraints) {
					formattedErrors[err.property] = Object.entries(err.constraints).map(([rule, msg]) => {
						return t ? t(`validation.${rule}`, { property: err.property, defaultValue: msg }) : msg;
					});
				}
			});

			return next(new AppError(ErrorCode.VALIDATION_FAILED, 400, formattedErrors));
		}

		req.body = dtoObj;
		next();
	};
}

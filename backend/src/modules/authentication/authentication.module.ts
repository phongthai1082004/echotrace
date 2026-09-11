import type { DependencyContainer } from 'tsyringe';
import { AuthRepository } from './repositories/auth.repository.js';
import { PasswordService } from './password/password.service.js';
import { SessionService } from './sessions/sessions.service.js';
import { OtpService } from './otp/otp.service.js';
import { OAuthService } from './oauth/oauth.service.js';

export function registerAuthentication(container: DependencyContainer): void {
	container.registerSingleton('AuthRepository', AuthRepository);
	container.registerSingleton('IPasswordService', PasswordService);
	container.registerSingleton('ISessionService', SessionService);
	container.registerSingleton('IOtpService', OtpService);
	container.registerSingleton('IOAuthService', OAuthService);
}

/**
 * Cross-domain ports (interfaces). Each domain declares what it needs from
 * another domain's service — consumers depend on these types, never on the
 * concrete infrastructure implementation.
 */

/** Email transport port — implemented by Notification infrastructure (Resend). */
export interface EmailMessage {
	to: string;
	subject: string;
	html: string;
	from?: string;
}

export interface IEmailService {
	send(msg: EmailMessage): Promise<void>;
}

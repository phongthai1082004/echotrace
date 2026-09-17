import { injectable } from 'tsyringe';
import {EmailMessage} from '@echotrace/shared';
import type {IEmailService} from '@echotrace/shared';

@injectable()
export class EmailService implements IEmailService {
	async send(msg: EmailMessage): Promise<void> {
		try {
			const res = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					from: msg.from || process.env.MAIL_FROM || 'onboarding@resend.dev',
					to: [msg.to],
					subject: msg.subject,
					html: msg.html,
				}),
			});
			if (!res.ok) console.error('[email] send failed:', await res.text());
		} catch (e: any) {
			console.error('[email] send error:', e?.message || e);
		}
	}
}

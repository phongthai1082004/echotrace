const otpTemplate = (otp: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8F2E5;font-family:'Space Grotesk',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
    <table width="400" cellpadding="0" cellspacing="0" style="background:#FFF7D6;border:3px solid #222;border-radius:12px;box-shadow:6px 6px 0 #222">
      <tr><td style="padding:32px 24px;text-align:center">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 8px;color:#222">Better Memoire</h1>
        <p style="font-size:13px;color:#666;margin:0 0 24px">Your verification code</p>
        <div style="background:#222;border-radius:8px;padding:16px;margin-bottom:24px">
          <span style="font-size:36px;font-weight:700;color:#fff;letter-spacing:8px">${otp}</span>
        </div>
        <p style="font-size:12px;color:#999;margin:0">This code expires in <strong style="color:#222">15 minutes</strong>.</p>
        <p style="font-size:10px;color:#999;margin:8px 0 0">If you didn't request this, please ignore this email.</p>
      </td></tr>
    </table>
        <p style="font-size:10px;color:#999;margin-top:16px">Better Memoire — Design your travel journals</p>
  </td></tr></table>
</body>
</html>`;

export async function sendOtpEmail(to: string, otp: string) {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		console.log(`[Mailer] Set RESEND_API_KEY in .env to send real emails`);
		return;
	}

	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: 'Better Memoire <noreply@bettermemoire.com>',
			to,
			subject: 'Your OTP Code — Better Memoire',
			html: otpTemplate(otp),
		}),
	});

	if (res.ok) {
		console.log(`[Mailer] Sent via Resend`);
	} else {
		console.log(`[Mailer] Resend failed: status ${res.status}`);
	}
}

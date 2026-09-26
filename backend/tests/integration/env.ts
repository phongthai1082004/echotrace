import 'reflect-metadata';

// trước khi container dựng PayOS và PrismaClient nối DB.
process.env.DATABASE_URL = 'postgresql://postgres:123abc@localhost:5432/echotrace_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.PAYOS_CLIENT_ID = 'test-client';
process.env.PAYOS_API_KEY = 'test-key';
process.env.PAYOS_CHECKSUM_KEY = 'test-checksum-key-1234567890';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.BACKEND_PORT = '4001';
process.env.CANCEL_URL = '/cancel';
process.env.RETURN_URL = '/success';
delete process.env.WEBHOOK_URL;
process.env.RESEND_API_KEY = '';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

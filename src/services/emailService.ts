import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.SMTP_FROM) {
    throw new Error('SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM to backend/.env');
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Travelmithra verification OTP',
    text: `Your Travelmithra verification OTP is ${otp}. It expires in 10 minutes.`,
  });
}

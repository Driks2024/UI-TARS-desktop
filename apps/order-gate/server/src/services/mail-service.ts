import nodemailer from 'nodemailer';

// Mock transport for dev
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass',
  },
});

export const sendOrderEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments: { filename: string; path: string }[]
) => {
  console.log(`Sending email to ${to} with subject: ${subject}`);
  console.log('Attachments:', attachments);

  if (process.env.NODE_ENV === 'production') {
    try {
      const info = await transporter.sendMail({
        from: '"Order Gate" <noreply@ordergate.com>',
        to,
        subject,
        html,
        attachments,
      });
      console.log('Message sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  } else {
    // In development, just log
    console.log('--- EMAIL MOCK ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(html);
    console.log('------------------');
    return { messageId: 'mock-id' };
  }
};

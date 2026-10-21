import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendVerificationEmailParams {
  to: string;
  name: string;
  token: string;
}

export async function sendVerificationEmail({ to, name, token }: SendVerificationEmailParams) {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'DevLife - Confirme seu e-mail',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Bem-vindo ao DevLife, ${name}!</h2>
        <p>Para ativar sua conta, clique no botão abaixo:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #2563eb; color: #fff; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Confirmar E-mail
          </a>
        </p>
        <p>Ou copie e cole o link abaixo no navegador:</p>
        <p style="word-break: break-all; color: #6b7280;">${verifyUrl}</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">
          Este link é válido por 24 horas. Se você não solicitou este cadastro, ignore este e-mail.
        </p>
      </div>
    `,
  });
}
interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  token: string;
}

export async function sendPasswordResetEmail({ to, name, token }: SendPasswordResetEmailParams) {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'DevLife - Recuperação de Senha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Recuperação de Senha</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Recebemos uma solicitação para redefinir sua senha no DevLife.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2563eb; color: #fff; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Redefinir Senha
          </a>
        </p>
        <p>Ou copie e cole o link abaixo no navegador:</p>
        <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">
          Este link é válido por 1 hora. Se você não solicitou esta recuperação, ignore este e-mail.
        </p>
      </div>
    `,
  });
}
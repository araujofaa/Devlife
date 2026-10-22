import { hash, compare } from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authRepository } from '../repository/auth.repository';
import { RegisterInput, LoginInput } from '../schemas/auth.schemas';
import { prisma } from '../../../shared/database/prisma';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../../services/email.service';

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const JWT_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

// 🆕 Configurações de bloqueio
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export const authService = {
  async register(data: RegisterInput) {
    const existing = await authRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('Email já cadastrado');
    }

    const password_hash = await hash(data.password, 10);
    const user = await authRepository.createUser({
      email: data.email,
      name: data.name,
      password_hash,
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.emailVerificationToken.create({
      data: { user_id: user.id, token, expires_at: expiresAt },
    });

    try {
      await sendVerificationEmail({ to: user.email, name: user.name, token });
    } catch (emailError) {
      console.error('Erro ao enviar e-mail de verificação:', emailError);
    }

    return {
      user: { id: user.id, email: user.email, name: user.name },
      message: 'Conta criada. Verifique seu e-mail para ativar.',
    };
  },

  async verifyEmail(token: string) {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) throw new Error('Token inválido');
    if (new Date() > record.expires_at) throw new Error('Token expirado');

    await prisma.user.update({
      where: { id: record.user_id },
      data: { email_verified: true },
    });

    await prisma.emailVerificationToken.delete({ where: { token } });

    return { message: 'E-mail verificado com sucesso!' };
  },

  async resendVerification(email: string) {
    const user = await authRepository.findByEmail(email);
    if (!user) throw new Error('Usuário não encontrado');
    if (user.email_verified) throw new Error('E-mail já verificado');

    await prisma.emailVerificationToken.deleteMany({ where: { user_id: user.id } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.emailVerificationToken.create({
      data: { user_id: user.id, token, expires_at: expiresAt },
    });

    await sendVerificationEmail({ to: user.email, name: user.name, token });

    return { message: 'E-mail de verificação reenviado.' };
  },

  // ============================================
  // 🆕 LOGIN com proteção contra força bruta
  // ============================================
  async login(data: LoginInput) {
    const user = await authRepository.findByEmail(data.email);

    if (!user) {
      // Não revela se o email existe ou não
      throw new Error('Credenciais inválidas');
    }

    // 🆕 Verifica se a conta está bloqueada
    if (user.locked_until && user.locked_until > new Date()) {
      const minutesLeft = Math.ceil(
        (user.locked_until.getTime() - Date.now()) / 1000 / 60
      );
      throw new Error(
        `Conta temporariamente bloqueada por segurança. Tente novamente em ${minutesLeft} minuto(s).`
      );
    }

    // Verifica se o e-mail foi confirmado
    if (!user.email_verified) {
      throw new Error('E-mail não verificado. Verifique sua caixa de entrada.');
    }

    const passwordMatch = await compare(data.password, user.password_hash);

    // 🆕 Senha incorreta → incrementa contador
    if (!passwordMatch) {
      const newAttempts = user.failed_login_attempts + 1;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        // Bloqueia a conta
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_DURATION_MINUTES);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failed_login_attempts: 0,
            locked_until: lockUntil,
          },
        });

        console.warn(
          `[Security] Conta bloqueada por excesso de tentativas: ${user.email}`
        );

        throw new Error(
          `Muitas tentativas falhas. Conta bloqueada por ${LOCK_DURATION_MINUTES} minutos.`
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failed_login_attempts: newAttempts },
      });

      const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
      throw new Error(
        `Credenciais inválidas. ${remaining} tentativa(s) restante(s) antes do bloqueio.`
      );
    }

    // 🆕 Login OK → reseta contadores
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: 0,
          locked_until: null,
        },
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRES_IN,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await authRepository.createRefreshToken(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  },

  async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, REFRESH_SECRET) as { id: string };

      const storedToken = await authRepository.findRefreshToken(refreshToken);
      if (!storedToken) throw new Error('Refresh token inválido');

      const user = await authRepository.findById(payload.id);
      if (!user) throw new Error('Usuário não encontrado');

      const accessToken = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return { accessToken };
    } catch {
      throw new Error('Refresh token inválido ou expirado');
    }
  },

  async logout(refreshToken: string) {
    await authRepository.deleteRefreshToken(refreshToken);
  },

  // ============================================
  // RECUPERAÇÃO DE SENHA
  // ============================================
  async forgotPassword(email: string) {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      return { message: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.' };
    }

    await prisma.passwordResetToken.deleteMany({ where: { user_id: user.id } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.passwordResetToken.create({
      data: { user_id: user.id, token, expires_at: expiresAt },
    });

    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, token });
    } catch (emailError) {
      console.error('Erro ao enviar e-mail de recuperação:', emailError);
    }

    return { message: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.' };
  },

  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) throw new Error('Token inválido');
    if (new Date() > record.expires_at) throw new Error('Token expirado');

    const newHash = await hash(newPassword, 10);

    await prisma.user.update({
      where: { id: record.user_id },
      data: {
        password_hash: newHash,
        // 🆕 Reseta os contadores ao trocar senha
        failed_login_attempts: 0,
        locked_until: null,
      },
    });

    await prisma.passwordResetToken.delete({ where: { token } });

    // Invalida todos os refresh tokens
    await prisma.refreshToken.deleteMany({ where: { user_id: record.user_id } });

    return { message: 'Senha redefinida com sucesso! Faça login novamente.' };
  },
};
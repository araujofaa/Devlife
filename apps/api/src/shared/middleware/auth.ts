import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authMiddleware = async (
  request: AuthRequest,
  reply: FastifyReply
) => {
  try {
    // 1. Tenta extrair o token do cookie (HttpOnly)
    let token = request.cookies?.access_token;

    // 2. Se não encontrou, tenta do header Authorization (Bearer)
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token não fornecido' },
      });
    }

    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      name: string;
    };
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token expirado ou inválido' },
    });
  }
};

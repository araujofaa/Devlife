'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@devlife/api-client';

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token não fornecido.');
      return;
    }

    const verify = async () => {
      try {
        const response = await apiClient.get(`/auth/verify-email?token=${token}`);
        if (response.success) {
          setStatus('success');
          setMessage('E-mail verificado com sucesso! Redirecionando...');
          setTimeout(() => router.push('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(response.error?.message || 'Erro ao verificar e-mail.');
        }
      } catch {
        setStatus('error');
        setMessage('Erro de conexão com o servidor.');
      }
    };
    verify();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-700 dark:text-gray-300">Verificando seu e-mail...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Sucesso!</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{message}</p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Ir para Login
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Erro</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{message}</p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Voltar ao Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
'use client';

import { usePWA } from '@/hooks/usePWA';
import { DevicePhoneMobileIcon, CheckCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function InstallPage() {
  const { isInstallable, isInstalled, install } = usePWA();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-bold">D</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            DevLife
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Instale como app no seu celular
          </p>
        </div>

        {isInstalled ? (
          <div className="text-center py-6">
            <CheckCircleIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Já instalado!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              O DevLife já está disponível na sua tela inicial.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Abrir DevLife
            </Link>
          </div>
        ) : isInstallable ? (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                ✨ Vantagens
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Acesso rápido pela tela inicial</li>
                <li>• Funciona offline</li>
                <li>• Notificações push</li>
                <li>• Tela cheia sem barra do navegador</li>
              </ul>
            </div>

            <button
              onClick={install}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Instalar DevLife
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <DevicePhoneMobileIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Como instalar
            </h2>
            <div className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-4">
              <div>
                <strong className="text-gray-900 dark:text-white">No Android (Chrome):</strong>
                <p>Menu (3 pontos) → "Instalar app" ou "Adicionar à tela inicial"</p>
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">No iOS (Safari):</strong>
                <p>Botão Compartilhar → "Adicionar à Tela de Início"</p>
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">No Desktop (Chrome/Edge):</strong>
                <p>Ícone de instalação na barra de endereço</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Continuar no navegador →
          </Link>
        </div>
      </div>
    </div>
  );
}
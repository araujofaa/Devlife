'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  TagIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { HomeIcon as HomeSolid } from '@heroicons/react/24/solid';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, activeIcon: HomeSolid },
  { name: 'Tarefas', href: '/tasks', icon: ClipboardDocumentListIcon },
  { name: 'Notas', href: '/notes', icon: DocumentTextIcon },
  { name: 'Categorias', href: '/categories', icon: TagIcon }, // 🆕 NOVO
  { name: 'Relatórios', href: '/reports', icon: DocumentChartBarIcon }, // 🆕 NOVO
  { name: 'Calendário', href: '/calendar', icon: CalendarDaysIcon }, // 🆕 NOVO
  { name: 'Perfil', href: '/profile', icon: UserIcon },
  { name: 'Configurações', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Instalar App', href: '/install', icon: DevicePhoneMobileIcon },
];

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors duration-300">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <Link href="/dashboard" className="text-xl font-bold text-blue-600 dark:text-blue-400">
          DevLife
        </Link>
        <ThemeToggle />
      </div>

      {/* Nome do usuário */}
      {user && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {user.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = isActive && item.activeIcon ? item.activeIcon : item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
                ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}
              />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
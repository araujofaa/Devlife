'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import MobileMenu from '@/components/MobileMenu';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import InstallPWA from '@/components/InstallPWA';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const pageTitle = pathname.split('/').filter(Boolean).pop() || 'Dashboard';
  const formattedTitle = pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex-1 lg:ml-64">
        <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMenu />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {formattedTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        <div className="hidden lg:flex sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-8 py-4 items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formattedTitle}
          </h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>

        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="p-4 md:p-6 lg:p-8"
        >
          {children}
        </motion.main>
      </div>
      <InstallPWA />
    </div>
  );
}
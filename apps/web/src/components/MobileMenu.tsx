'use client';

import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Abrir menu"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden w-72">
            <div className="relative h-full">
              <Sidebar />
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg lg:hidden"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
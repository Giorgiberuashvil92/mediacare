'use client';

import { useState } from 'react';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* AI Assistant Card - Left Side */}
      

      {/* AI Assistant Card - Right Side */}
   

      {/* AI Assistant Modal/Window - Future implementation */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-dark">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white">
              AI ასისტენტი
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              აქ იქნება AI ასისტენტის ინტერფეისი
            </p>
          </div>
        </div>
      )}
    </>
  );
}

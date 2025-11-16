import type { PropsWithChildren } from 'react';

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
      {children}
    </div>
  );
}


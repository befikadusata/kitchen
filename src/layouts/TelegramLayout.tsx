import React from 'react';

interface TelegramLayoutProps {
  children: React.ReactNode;
}

export default function TelegramLayout({ children }: TelegramLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#1A1A1B] flex flex-col font-sans">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

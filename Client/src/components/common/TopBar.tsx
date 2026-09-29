'use client';
import React from 'react';
import Link from 'next/link';

export default function TopBar() {
  return (
    <header className="flex items-center justify-between h-[72px] px-6 bg-white border-b border-gray-200 sticky top-0 z-40 w-full shadow-sm flex-shrink-0">
      {/* Left: Empty (Logo moved to sidebar) */}
      <div className="flex items-center gap-6">
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 relative transition-colors">
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white"></span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>

        <div className="w-px h-8 bg-gray-200 hidden md:block"></div>

        {/* User Profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-gray-900 leading-tight group-hover:text-orange-500 transition-colors">Sarah Jenkins</span>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Dispatcher</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 font-bold overflow-hidden">
            <img src="https://ui-avatars.com/api/?name=Sarah+Jenkins&background=EFF6FF&color=F97316" alt="User Avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
}

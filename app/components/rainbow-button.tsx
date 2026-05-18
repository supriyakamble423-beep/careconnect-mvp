"use client";

import React from 'react';

export const RainbowButton = ({ onClick, children }: { onClick?: () => void, children: React.ReactNode }) => {
  return (
    <div className="relative inline-flex items-center justify-center">
      <button 
        onClick={onClick}
        className="rainbow-border relative w-full min-w-[140px] h-12 flex items-center justify-center gap-2.5 px-6 bg-[#1a1a1a] dark:bg-black rounded-xl border-none text-white cursor-pointer font-extrabold transition-all duration-200 active:scale-95"
      >
        {children}
      </button>
      
      <style jsx>{`
        .rainbow-border::before,
        .rainbow-border::after {
          content: '';
          position: absolute;
          left: -2px;
          top: -2px;
          border-radius: 14px;
          background: linear-gradient(45deg, #fb0094, #0000ff, #00ff00, #ffff00, #ff0000, #fb0094, #0000ff, #00ff00, #ffff00, #ff0000);
          background-size: 400%;
          width: calc(100% + 4px);
          height: calc(100% + 4px);
          z-index: -1;
          animation: rainbow 20s linear infinite;
        }
        .rainbow-border::after {
          filter: blur(20px);
          opacity: 0.7;
        }
        @keyframes rainbow {
          0% { background-position: 0 0; }
          50% { background-position: 400% 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
};
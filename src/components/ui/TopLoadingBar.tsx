
import React from 'react';

export const TopLoadingBar: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] h-1 bg-tm-accent/20 overflow-hidden transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className={`h-full bg-tm-primary transition-all duration-500 ease-out ${isLoading ? 'animate-[loading-progress_2s_infinite_linear]' : 'w-0'}`}></div>
      <style>{`
        @keyframes loading-progress {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 70%; transform: translateX(20%); }
          100% { width: 100%; transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

import React from 'react';

interface FloatingActionBarProps {
  isVisible: boolean;
  children: React.ReactNode;
}

const FloatingActionBar: React.FC<FloatingActionBarProps> = ({ isVisible, children }) => {
  return (
    <div
      className={`fixed bottom-0 left-0 md:left-64 right-0 z-10 transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!isVisible}
    >
      <div className="flex items-center justify-end px-6 py-4 space-x-3 bg-white border-t border-gray-200 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
        {children}
      </div>
    </div>
  );
};

export default FloatingActionBar;

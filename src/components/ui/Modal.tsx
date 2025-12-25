
import React, { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '../icons/CloseIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  hideDefaultCloseButton?: boolean;
  closeButtonText?: string;
  zIndex?: string;
  disableContentPadding?: boolean;
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    'full': 'max-w-[95vw]'
}

const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    footerContent, 
    size = 'lg', 
    hideDefaultCloseButton = false, 
    closeButtonText = 'Tutup', 
    zIndex = 'z-50', 
    disableContentPadding = false 
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Handle visibility state for animations
  useEffect(() => {
    if (isOpen) {
        setIsVisible(true);
        // Small delay to allow render before animating opacity
        requestAnimationFrame(() => setIsAnimating(true));
    } else {
        setIsAnimating(false);
        // Wait for animation to finish before hiding
        const timer = setTimeout(() => setIsVisible(false), 300);
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Professional scroll lock implementation
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyPaddingRight = document.body.style.paddingRight;
      
      const isAlreadyHidden = originalBodyOverflow === 'hidden';

      if (!isAlreadyHidden) {
          const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
          document.body.style.overflow = 'hidden';
          if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
          }
      }
      
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);

      return () => {
        if (!isAlreadyHidden) {
            document.body.style.overflow = originalBodyOverflow;
            document.body.style.paddingRight = originalBodyPaddingRight;
        }
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isVisible && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndex} overflow-y-auto custom-scrollbar`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with Blur Effect */}
      <div
        className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      {/* Centering container */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
          {/* Modal Panel */}
          <div
              ref={modalRef}
              className={`
                relative w-full transform rounded-2xl bg-white text-left shadow-2xl ring-1 ring-black/5 transition-all duration-300 ease-out flex flex-col max-h-[90vh]
                ${sizeClasses[size]}
                ${isAnimating ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
              `}
              onClick={(e) => e.stopPropagation()}
          >
              {/* Header - Clean & Elegant */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold leading-6 text-gray-900 tracking-tight" id="modal-title">
                      {title}
                  </h3>
                  <button
                      type="button"
                      className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-tm-primary/50"
                      onClick={onClose}
                      aria-label="Tutup modal"
                  >
                      <CloseIcon className="w-5 h-5" />
                  </button>
              </div>
              
              {/* Content Area - Spacious */}
              <div className="flex-auto overflow-y-auto custom-scrollbar">
                  <div className={`${!disableContentPadding ? 'p-6' : ''}`}>
                      {children}
                  </div>
              </div>
              
              {/* Footer - Distinct Area */}
              {(footerContent || !hideDefaultCloseButton) && (
                  <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row items-center justify-end px-6 py-4 gap-3 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
                      {!hideDefaultCloseButton && (
                          <button
                              type="button"
                              onClick={onClose}
                              className="w-full sm:w-auto inline-flex justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all active:scale-95"
                              >
                              {closeButtonText}
                          </button>
                      )}
                      {footerContent}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Modal;

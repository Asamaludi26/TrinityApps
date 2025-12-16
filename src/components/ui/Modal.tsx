
import React, { useEffect, useRef } from 'react';
import { CloseIcon } from '../icons/CloseIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
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
    '3xl': 'max-w-3xl'
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footerContent, size = 'lg', hideDefaultCloseButton = false, closeButtonText = 'Tutup', zIndex = 'z-50', disableContentPadding = false }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Professional scroll lock implementation to prevent layout shift (the "vibration")
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.paddingRight = originalBodyPaddingRight;
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 ${zIndex} overflow-y-auto custom-scrollbar transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      {/* Centering container */}
      <div className="flex items-center justify-center min-h-full p-4 text-center">
            
          {/* Modal panel */}
          <div
              ref={modalRef}
              className={`relative w-full my-4 sm:my-8 text-left align-middle bg-white rounded-xl shadow-xl transform transition-all duration-300 ease-in-out 
                         ${sizeClasses[size]}
                         ${isOpen ? 'opacity-100 scale-100' : 'opacity-95 scale-95'}
                         flex flex-col max-h-[90vh]`}
              onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
          >
              {/* Header */}
              <div className="flex-shrink-0 flex items-start justify-between p-4 border-b rounded-t">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 pr-4" id="modal-title">
                      {title}
                  </h3>
                  <button
                      type="button"
                      className="inline-flex items-center p-1.5 ml-auto text-sm text-gray-400 bg-transparent rounded-lg hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      onClick={onClose}
                      aria-label="Tutup modal"
                  >
                      <CloseIcon className="w-5 h-5" />
                      <span className="sr-only">Tutup modal</span>
                  </button>
              </div>
              
              {/* Scrollable Content Area */}
              <div className="flex-auto overflow-y-auto custom-scrollbar">
                  <div className={`${!disableContentPadding ? 'p-4 sm:p-6' : ''}`}>
                      {children}
                  </div>
              </div>
              
              {/* Footer */}
              {(footerContent || !hideDefaultCloseButton) && (
                  <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row items-center justify-end p-4 gap-3 border-t bg-gray-50 rounded-b-xl">
                      {!hideDefaultCloseButton && (
                          <button
                              type="button"
                              onClick={onClose}
                              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
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

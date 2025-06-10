
import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '../../constants'; // Ensure path is correct based on project structure

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as="div" // Alterado de Fragment para div
          className="fixed inset-0 bg-black/70 transition-opacity" // Classes do overlay movidas para cá
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        />
        {/* O div filho original foi removido pois o Transition.Child agora É o overlay */}

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as="div" 
              className="flex items-center justify-center min-h-full w-full p-4 text-center sm:p-0" 
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel 
                className={`relative transform overflow-hidden rounded-lg bg-neutral-800 text-left shadow-xl transition-all sm:my-8 sm:w-full ${sizeClasses[size]}`}
              >
                <div className="bg-neutral-700/60 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-neutral-600 flex justify-between items-center">
                  {title && (
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-neutral-100">
                      {title}
                    </Dialog.Title>
                  )}
                  {!title && <div className="flex-grow"></div>} 
                  <button
                    type="button"
                    className={`rounded-md p-1 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-neutral-700 ${title ? 'ml-auto' : ''}`}
                    onClick={onClose}
                    aria-label="Fechar modal"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="bg-neutral-800 px-4 pt-5 pb-4 sm:p-6 text-neutral-300">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

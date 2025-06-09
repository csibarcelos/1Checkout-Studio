import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  onClick?: () => void; // Added optional onClick handler
}

export const Card: React.FC<CardProps> = ({ children, className, title, actions, onClick }) => {
  return (
    <div 
      className={`bg-neutral-800 shadow-lg rounded-lg overflow-hidden border border-neutral-700/50 ${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
      onClick={onClick} // Attach onClick handler
    >
      {(title || actions) && (
        <div className="px-4 py-4 sm:px-6 border-b border-neutral-700 flex justify-between items-center">
          {title && <h3 className="text-lg leading-6 font-semibold text-neutral-100">{title}</h3>}
          {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
};
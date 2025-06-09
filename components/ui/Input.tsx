
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  labelClassName?: string; // Added optional prop for label class
}

export const Input: React.FC<InputProps> = ({ label, name, error, icon, className, labelClassName, ...props }) => {
  const hasError = Boolean(error);
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={name} 
          className={`block text-sm font-medium mb-1 ${labelClassName || 'text-neutral-300'}`} // Apply labelClassName or default
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            {icon}
          </div>
        )}
        <input
          id={name}
          name={name}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm transition-colors duration-150
            ${icon ? 'pl-10' : ''}
            ${hasError 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500 text-red-500 placeholder-red-400' 
              : 'border-neutral-600 focus:border-primary focus:ring-2 focus:ring-primary/70 text-neutral-100 placeholder-neutral-400'}
            ${props.disabled ? 'bg-neutral-700 cursor-not-allowed opacity-70' : 'bg-neutral-800'}
            ${className || ''}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  labelClassName?: string; // Added optional prop for label class
}

export const Textarea: React.FC<TextareaProps> = ({ label, name, error, className, labelClassName, ...props }) => {
  const hasError = Boolean(error);
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={name} 
          className={`block text-sm font-medium mb-1 ${labelClassName || 'text-neutral-300'}`} // Apply labelClassName or default
        >
          {label}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        rows={props.rows || 3}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm transition-colors duration-150
          ${hasError 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500 text-red-500 placeholder-red-400' 
            : 'border-neutral-600 focus:border-primary focus:ring-2 focus:ring-primary/70 text-neutral-100 placeholder-neutral-400'}
          ${props.disabled ? 'bg-neutral-700 cursor-not-allowed opacity-70' : 'bg-neutral-800'}
          ${className || ''}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
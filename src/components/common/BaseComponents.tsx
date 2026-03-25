import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary/50',
    secondary: 'bg-secondary text-white hover:bg-secondary/90 focus:ring-secondary/50',
    ghost: 'bg-transparent text-text-main hover:bg-black/5 focus:ring-black/10',
    danger: 'bg-danger/10 text-danger border border-danger hover:bg-danger/20 focus:ring-danger/40',
    success: 'bg-success/10 text-success border border-success hover:bg-success/20 focus:ring-success/40',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-sm',
    md: 'px-5 py-2.5 text-sm rounded-md',
    lg: 'px-8 py-4 text-base rounded-lg',
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<{ title?: string; children: React.ReactNode; className?: string; icon?: React.ReactNode }> = ({ 
  title, 
  children, 
  className = '',
  icon
}) => (
  <div className={`bg-surface border border-black/5 shadow-sm rounded-lg overflow-hidden ${className}`}>
    {title && (
      <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest font-bold text-text-muted flex items-center gap-2">
          {icon} {title}
        </h3>
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

export const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`bg-background rounded-xl p-6 border border-black/5 ${className}`}>
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }> = ({ 
  label, 
  error, 
  className = '', 
  ...props 
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">{label}</label>}
    <input 
      className={`bg-white border text-sm px-4 py-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${error ? 'border-danger' : 'border-black/10 focus:border-primary'} ${className}`}
      {...props}
    />
    {error && <span className="text-[10px] font-bold text-danger px-1">{error}</span>}
  </div>
);

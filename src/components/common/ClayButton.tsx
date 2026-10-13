import React from 'react';
import clsx from 'clsx';

interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const ClayButton: React.FC<ClayButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      className={clsx(
        'clay-btn',
        `clay-btn-${variant}`,
        size === 'sm' && 'clay-btn-sm',
        !children && icon && 'clay-btn-icon',
        className
      )}
      {...props}
    >
      {icon && <span className="clay-btn-icon-wrapper">{icon}</span>}
      {children}
    </button>
  );
};

import React from 'react';
import clsx from 'clsx';

interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const ClayCard: React.FC<ClayCardProps> = ({
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={clsx('clay-card', interactive && 'clay-card-interactive', className)}
      {...props}
    >
      {children}
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';

export interface BackButtonProps {
  to?: string;
  label?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * BackButton renders a full-width, 56px+ tap target designed for comfortable one-thumb navigation.
 * Intended to be placed in the bottom action zone of PageShell.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  to = '/',
  label = 'Back to all canteens',
  ariaLabel,
  className = '',
}) => {
  return (
    <Link
      to={to}
      className={`back-button ${className}`}
      aria-label={ariaLabel || label}
    >
      <span className="back-button-icon" aria-hidden="true">
        ←
      </span>
      <span className="back-button-label">{label}</span>
    </Link>
  );
};

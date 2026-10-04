import React from 'react';

/**
 * SkipLink provides keyboard and screen-reader users with an immediate shortcut
 * to bypass repetitive header elements and jump directly to the main content landmark.
 */
export const SkipLink: React.FC = () => {
  return (
    <a href="#main" className="skip-link">
      Skip to main content
    </a>
  );
};

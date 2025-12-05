/**
 * Card Component
 * ==============
 * Wiederverwendbare Karten-Komponente für React
 */

import React from 'react';

/**
 * Card Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Inhalt der Card
 * @param {string} [props.className] - Zusätzliche CSS-Klassen
 * @param {Object} [props.style] - Inline-Styles
 * @param {Function} [props.onClick] - Click-Handler
 */
export const Card = ({ 
  children, 
  className = '', 
  style = {},
  onClick,
  ...props 
}) => {
  const baseClasses = 'rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-sm';
  const combinedClasses = onClick 
    ? `${baseClasses} cursor-pointer transition-opacity hover:opacity-90 ${className}`
    : `${baseClasses} ${className}`;

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={combinedClasses.trim()}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Card;

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Tooltip d'information contextuelle
 * Affiche un ? qui révèle une explication au hover/clic
 */
export default function InfoTooltip({ text, position = 'top', size = 'sm' }) {
  const [isVisible, setIsVisible] = useState(false);

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-warm-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-warm-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-warm-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-warm-800 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      <HelpCircle
        className={`${sizeClasses[size]} text-warm-400 hover:text-brand-500 cursor-help transition-colors`}
      />

      {/* Tooltip */}
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} w-64 animate-fade-in`}
        >
          <div className="bg-warm-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg leading-relaxed">
            {text}
          </div>
          {/* Flèche */}
          <div
            className={`absolute border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * Modal réutilisable avec animation
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'default', // 'small' | 'default' | 'large' | 'full'
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
}) {
  // Fermer avec Escape
  const handleEscape = useCallback((e) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-md',
    default: 'max-w-lg',
    large: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw] max-h-[90vh]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-warm-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="px-6 py-4 border-b border-warm-100 flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2 id="modal-title" className="font-display font-semibold text-lg text-warm-900">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-warm-500 mt-1">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -m-2 rounded-lg hover:bg-warm-100 text-warm-400 hover:text-warm-600 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-warm-50 border-t border-warm-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Footer avec boutons standard
 */
Modal.Footer = function ModalFooter({ 
  onCancel, 
  onConfirm, 
  cancelLabel = 'Annuler', 
  confirmLabel = 'Confirmer',
  confirmVariant = 'primary', // 'primary' | 'danger'
  loading = false,
  disabled = false,
}) {
  const confirmClasses = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <div className="flex items-center justify-end gap-3">
      {onCancel && (
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-warm-600 hover:text-warm-800 font-medium transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      )}
      {onConfirm && (
        <button
          onClick={onConfirm}
          disabled={loading || disabled}
          className={`px-4 py-2 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmClasses[confirmVariant]}`}
        >
          {loading ? 'Chargement...' : confirmLabel}
        </button>
      )}
    </div>
  );
};

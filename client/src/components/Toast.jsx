import { useEffect } from 'react';

export default function Toast({ message, isVisible, onClose, variant = 'default' }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 2500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const variants = {
    default: 'bg-[var(--color-accent)] text-white',
    success: 'bg-[var(--color-success)] text-white',
    error: 'bg-[var(--color-error)] text-white',
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-in-bottom safe-area-bottom">
      <div className={`${variants[variant]} px-5 py-3 rounded-full text-sm font-medium shadow-[var(--shadow-lg)] flex items-center gap-2`}>
        {variant === 'success' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {message}
      </div>
    </div>
  );
}

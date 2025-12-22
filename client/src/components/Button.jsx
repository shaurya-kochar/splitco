export default function Button({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  type = 'button',
  className = '' 
}) {
  const baseStyles = "w-full py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200 press-effect";
  
  const variants = {
    primary: `bg-[var(--color-accent)] text-[#0a0a0b] ${
      disabled 
        ? 'opacity-40 cursor-not-allowed' 
        : 'hover:opacity-90 active:scale-[0.98]'
    }`,
    secondary: `bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] ${
      disabled 
        ? 'opacity-40 cursor-not-allowed' 
        : 'hover:bg-[var(--color-surface-elevated)] active:scale-[0.98]'
    }`,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

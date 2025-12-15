export default function Button({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  type = 'button',
  className = '' 
}) {
  const baseStyles = "w-full py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200";
  
  const variants = {
    primary: `bg-[var(--color-accent)] text-white shadow-[var(--shadow-md)] ${
      disabled 
        ? 'opacity-40 cursor-not-allowed' 
        : 'hover:bg-[var(--color-accent-hover)] active:scale-[0.98]'
    }`,
    secondary: `bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] ${
      disabled 
        ? 'opacity-40 cursor-not-allowed' 
        : 'hover:bg-[var(--color-accent-subtle)] active:scale-[0.98]'
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

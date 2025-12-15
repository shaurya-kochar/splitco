export default function Button({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  type = 'button',
  className = '' 
}) {
  const baseStyles = "w-full py-4 px-6 rounded-xl font-medium text-base transition-all duration-200 ease-out";
  
  const variants = {
    primary: `bg-[var(--color-accent)] text-white ${
      disabled 
        ? 'opacity-40 cursor-not-allowed' 
        : 'hover:bg-[var(--color-accent-hover)] active:scale-[0.98]'
    }`,
    secondary: `bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] ${
      disabled 
        ? 'opacity-40 cursor-not-allowed' 
        : 'hover:bg-[var(--color-bg)] active:scale-[0.98]'
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

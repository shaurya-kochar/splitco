export default function HeroCard({ balance, type = 'balance', members = [], splitCount = 0, expenseCount = 0, onClick }) {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const isPositive = balance >= 0;
  const balanceText = type === 'group' 
    ? 'Total group spending'
    : balance > 0 ? 'You get back' : balance < 0 ? 'You owe' : 'All settled up';

  return (
    <div 
      className="hero-card animate-fade-in"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#0a0a0b]/70 mb-2">
            {type === 'balance' ? 'Your Net Balance' : 'Total Amount'}
          </p>
          <p className={`text-5xl font-extrabold tracking-tight text-[#0a0a0b] mb-2 ${balance === 0 ? 'opacity-60' : ''}`}>
            {balance !== 0 && (isPositive ? '+' : '-')}
            {formatAmount(balance)}
          </p>
          <p className="text-sm font-medium text-[#0a0a0b]/80">
            {balanceText}
          </p>
        </div>
        {/* {members.length > 0 && (
          <div className="flex -space-x-2">
            {members.slice(0, 3).map((member, index) => (
              <div 
                key={member.id || index}
                className="w-10 h-10 rounded-full bg-[#0a0a0b]/20 backdrop-blur-sm border-2 border-[var(--color-accent)] flex items-center justify-center text-sm font-semibold text-[#0a0a0b]"
                style={{ zIndex: 3 - index }}
              >
                {(member.name || member.phone || '?').charAt(0).toUpperCase()}
              </div>
            ))}
            {members.length > 3 && (
              <div className="w-10 h-10 rounded-full bg-[#0a0a0b]/20 backdrop-blur-sm border-2 border-[var(--color-accent)] flex items-center justify-center text-xs font-semibold text-[#0a0a0b]" style={{ zIndex: 0 }}>
                +{members.length - 3}
              </div>
            )}
          </div>
        )} */}
      </div>
      
      {/* Visual Element */}
      <div className="flex items-center justify-between pt-4 border-t border-[#0a0a0b]/10">
        <div className="flex items-center gap-3 text-sm font-medium text-[#0a0a0b]/70">
          {splitCount > 0 && <span>{splitCount} {splitCount === 1 ? 'split' : 'splits'}</span>}
          {splitCount > 0 && expenseCount > 0 && <span>·</span>}
          {expenseCount > 0 && <span>{expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}</span>}
        </div>
        {onClick && (
          <svg className="w-5 h-5 text-[#0a0a0b]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );
}

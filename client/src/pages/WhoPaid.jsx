import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getGroupDetails } from '../api/groups';
import { useAuth } from '../context/AuthContext';

export default function WhoPaid() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const expenseData = location.state?.expenseData;
  
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Payment state
  const [paymentMode, setPaymentMode] = useState('single'); // 'single' or 'multiple'
  const [selectedPayerId, setSelectedPayerId] = useState(user?.id);
  const [showPayerDropdown, setShowPayerDropdown] = useState(false);
  const [memberPayments, setMemberPayments] = useState([]);
  const [customPayMode, setCustomPayMode] = useState('equal'); // 'equal' or 'custom'

  useEffect(() => {
    if (!expenseData) {
      navigate(`/group/${groupId}/add-expense`, { replace: true });
      return;
    }
    loadGroup();
  }, [groupId, expenseData]);

  const loadGroup = async () => {
    try {
      const response = await getGroupDetails(groupId);
      setGroup(response.group);
      initializePayments(response.group);
    } catch (err) {
      setError('Failed to load group');
    } finally {
      setIsLoading(false);
    }
  };

  const initializePayments = (groupData) => {
    const amount = expenseData.amount;
    const members = groupData.members;
    const equalShare = Number((amount / members.length).toFixed(2));
    
    const payments = members.map(member => ({
      userId: member.id,
      userName: member.name || member.phone,
      isIncluded: true,
      paidAmount: equalShare,
      isCurrentUser: member.id === user?.id
    }));
    
    setMemberPayments(payments);
  };

  const handlePaymentModeToggle = (mode) => {
    setPaymentMode(mode);
    if (mode === 'single') {
      setSelectedPayerId(user?.id);
    }
  };

  const handleTogglePayer = (userId) => {
    setMemberPayments(prev => {
      const updated = prev.map(payment => {
        if (payment.userId === userId) {
          return { ...payment, isIncluded: !payment.isIncluded };
        }
        return payment;
      });
      
      // Recalculate equal pay if in equal mode
      if (customPayMode === 'equal') {
        const includedCount = updated.filter(p => p.isIncluded).length;
        if (includedCount > 0) {
          const equalAmount = Number((expenseData.amount / includedCount).toFixed(2));
          return updated.map(payment => ({
            ...payment,
            paidAmount: payment.isIncluded ? equalAmount : 0
          }));
        }
      }
      
      return updated;
    });
  };

  const handleCustomPaymentChange = (userId, value) => {
    if (value !== '' && !/^\d*\.?\d{0,2}$/.test(value)) {
      return;
    }
    
    const numValue = value === '' ? 0 : parseFloat(value);
    
    if (!isNaN(numValue) && numValue >= 0 && numValue <= expenseData.amount) {
      setMemberPayments(prev => prev.map(payment => {
        if (payment.userId === userId) {
          return { ...payment, paidAmount: numValue };
        }
        return payment;
      }));
    }
  };

  const handleCustomPaymentBlur = (userId) => {
    setMemberPayments(prev => prev.map(payment => {
      if (payment.userId === userId && payment.paidAmount === 0) {
        return { ...payment, isIncluded: false };
      }
      return payment;
    }));
  };

  const handleEqualPayToggle = () => {
    setCustomPayMode('equal');
    const includedCount = memberPayments.filter(p => p.isIncluded).length;
    if (includedCount > 0) {
      const equalAmount = Number((expenseData.amount / includedCount).toFixed(2));
      setMemberPayments(prev => prev.map(payment => ({
        ...payment,
        paidAmount: payment.isIncluded ? equalAmount : 0
      })));
    }
  };

  const handleCustomPayToggle = () => {
    setCustomPayMode('custom');
  };

  const calculateTotal = () => {
    return memberPayments
      .filter(p => p.isIncluded)
      .reduce((sum, payment) => sum + payment.paidAmount, 0);
  };

  const isValidPayment = () => {
    if (paymentMode === 'single') {
      return selectedPayerId != null;
    }
    
    const total = calculateTotal();
    const diff = Math.abs(total - expenseData.amount);
    const hasIncluded = memberPayments.some(p => p.isIncluded);
    
    if (!hasIncluded) return false;
    if (diff >= 0.01) return false;
    
    const allPositive = memberPayments.every(p => !p.isIncluded || p.paidAmount > 0);
    return allPositive;
  };

  const handleContinue = () => {
    if (!isValidPayment()) return;

    const paidByData = paymentMode === 'single'
      ? { mode: 'single', userId: selectedPayerId }
      : { 
          mode: 'multiple', 
          payments: memberPayments
            .filter(p => p.isIncluded)
            .map(p => ({ userId: p.userId, amount: p.paidAmount }))
        };

    navigate(`/group/${groupId}/add-expense/split`, {
      state: {
        expenseData: {
          ...expenseData,
          paidBy: paidByData
        }
      }
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDisplayName = (payment) => {
    if (payment.isCurrentUser) return 'You';
    return payment.userName;
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const total = calculateTotal();
  const diff = Math.abs(total - expenseData.amount);
  const isValid = isValidPayment();

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(`/group/${groupId}/add-expense`, { 
              state: { expenseData } 
            })}
            className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
            Who paid?
          </h1>
          <div className="w-6" />
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Amount Display */}
        <div className="px-6 py-6 border-b border-[var(--color-border-subtle)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Total amount</p>
          <p className="text-3xl font-semibold text-[var(--color-text-primary)] rupee">
            {formatAmount(expenseData.amount)}
          </p>
          {expenseData.description && (
            <p className="text-sm text-[var(--color-text-muted)] mt-2">
              {expenseData.description}
            </p>
          )}
        </div>

        {/* Payment Mode Toggle */}
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex gap-2">
            <button
              onClick={() => handlePaymentModeToggle('single')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                paymentMode === 'single'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-accent-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
              }`}
            >
              Single Payer
            </button>
            <button
              onClick={() => handlePaymentModeToggle('multiple')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                paymentMode === 'multiple'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-accent-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
              }`}
            >
              Multiple Payers
            </button>
          </div>
        </div>

        {/* Single Payer Mode */}
        {paymentMode === 'single' && (
          <div className="flex-1 px-6 py-4">
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">Who paid?</p>
            <div className="relative">
              <button
                onClick={() => setShowPayerDropdown(!showPayerDropdown)}
                className="w-full card p-4 flex items-center justify-between hover:bg-[var(--color-border-subtle)] transition-colors"
              >
                <span className="font-medium text-[var(--color-text-primary)]">
                  {group.members.find(m => m.id === selectedPayerId)?.id === user?.id
                    ? 'You'
                    : (group.members.find(m => m.id === selectedPayerId)?.name || 'Select member')}
                </span>
                <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPayerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden z-20">
                  {group.members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setSelectedPayerId(member.id);
                        setShowPayerDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-[var(--color-border-subtle)] transition-colors ${
                        member.id === selectedPayerId ? 'bg-[var(--color-accent-subtle)]' : ''
                      }`}
                    >
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {member.id === user?.id ? 'You' : member.name || member.phone}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Multiple Payers Mode */}
        {paymentMode === 'multiple' && (
          <>
            {/* Equal/Custom Toggle */}
            <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
              <div className="flex gap-2">
                <button
                  onClick={handleEqualPayToggle}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    customPayMode === 'equal'
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-accent-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  Equal Pay
                </button>
                <button
                  onClick={handleCustomPayToggle}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    customPayMode === 'custom'
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-accent-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  Custom Amounts
                </button>
              </div>
            </div>

            {/* Payers List */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="space-y-2">
                {memberPayments.map((payment, index) => (
                  <div
                    key={payment.userId}
                    className={`card p-4 transition-all duration-200 animate-fade-in ${
                      !payment.isIncluded ? 'opacity-40' : ''
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={() => handleTogglePayer(payment.userId)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                            payment.isIncluded
                              ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                              : 'bg-transparent border-[var(--color-border)]'
                          }`}
                        >
                          {payment.isIncluded && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-[var(--color-text-primary)] truncate">
                          {formatDisplayName(payment)}
                        </span>
                      </button>

                      {payment.isIncluded && (
                        <div className="flex items-center">
                          {customPayMode === 'custom' ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[var(--color-text-muted)]">₹</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={payment.paidAmount || ''}
                                onChange={(e) => handleCustomPaymentChange(payment.userId, e.target.value)}
                                onBlur={() => handleCustomPaymentBlur(payment.userId)}
                                className="w-20 text-right bg-transparent text-[var(--color-text-primary)] font-medium focus:outline-none border-b border-[var(--color-border)] focus:border-[var(--color-accent)] transition-colors"
                                placeholder="0"
                              />
                            </div>
                          ) : (
                            <span className="text-[var(--color-text-primary)] font-medium rupee">
                              {formatAmount(payment.paidAmount)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Hint */}
            {!isValid && memberPayments.some(p => p.isIncluded) && (
              <div className="px-6 py-3 bg-[var(--color-accent-subtle)] border-t border-[var(--color-border-subtle)]">
                <p className="text-sm text-[var(--color-text-secondary)] text-center">
                  Total paid {formatAmount(total)} · {diff > 0.01 ? `${formatAmount(diff)} ${total > expenseData.amount ? 'over' : 'short'}` : 'Must match expense amount'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Continue Button */}
        <div className="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-border-subtle)] safe-area-bottom">
          <div className="px-6 py-4">
            <button
              onClick={handleContinue}
              disabled={!isValid}
              className={`w-full py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200 ${
                isValid
                  ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] active:scale-[0.98] shadow-[var(--shadow-md)]'
                  : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

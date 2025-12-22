import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getGroupDetails, createExpense } from '../api/groups';
import { useAuth } from '../context/AuthContext';

export default function AddExpense() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const amountInputRef = useRef(null);
  
  const [group, setGroup] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [showSplitCustomize, setShowSplitCustomize] = useState(false);
  const [selectedPayer, setSelectedPayer] = useState(null);
  const [splitMembers, setSplitMembers] = useState([]);

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  useEffect(() => {
    if (group && group.members) {
      // Initialize splits
      const currentUserMember = group.members.find(m => m.id === user?.id);
      setSelectedPayer(currentUserMember || group.members[0]);
      
      const equalShare = amount ? Number((parseFloat(amount) / group.members.length).toFixed(2)) : 0;
      setSplitMembers(group.members.map(member => ({
        ...member,
        included: true,
        share: equalShare
      })));
    }
  }, [group, user]);

  useEffect(() => {
    // Recalculate equal splits when amount changes
    if (group && amount) {
      const numAmount = parseFloat(amount);
      if (numAmount > 0) {
        const includedCount = splitMembers.filter(m => m.included).length;
        if (includedCount > 0) {
          const equalShare = Number((numAmount / includedCount).toFixed(2));
          setSplitMembers(prev => prev.map(member => ({
            ...member,
            share: member.included ? equalShare : 0
          })));
        }
      }
    }
  }, [amount, group]);

  const loadGroup = async () => {
    try {
      const response = await getGroupDetails(groupId);
      setGroup(response.group);
    } catch (err) {
      setError('Failed to load group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (value) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  const handleNumberPad = (key) => {
    if (key === 'backspace') {
      setAmount(prev => prev.slice(0, -1));
    } else if (key === 'clear') {
      setAmount('');
    } else if (key === '.') {
      if (!amount.includes('.')) {
        setAmount(prev => prev + '.');
      }
    } else {
      setAmount(prev => prev + key);
    }
  };

  const handleToggleMember = (memberId) => {
    setSplitMembers(prev => {
      const updated = prev.map(m => 
        m.id === memberId ? { ...m, included: !m.included } : m
      );
      
      // Recalculate equal split
      const numAmount = parseFloat(amount);
      if (numAmount > 0) {
        const includedCount = updated.filter(m => m.included).length;
        if (includedCount > 0) {
          const equalShare = Number((numAmount / includedCount).toFixed(2));
          return updated.map(m => ({
            ...m,
            share: m.included ? equalShare : 0
          }));
        }
      }
      return updated;
    });
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    const includedMembers = splitMembers.filter(m => m.included);
    if (includedMembers.length === 0) {
      setError('Select at least one person to split with');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const splits = includedMembers.map(m => ({
        userId: m.id,
        shareAmount: m.share
      }));

      await createExpense(groupId, {
        amount: numAmount,
        description: description.trim() || null,
        paidBy: { mode: 'single', userId: selectedPayer.id },
        splits
      });

      navigate(`/group/${groupId}`, {
        state: { expenseAdded: true },
        replace: true
      });
    } catch (err) {
      setError(err.message || 'Failed to create expense');
      setIsSaving(false);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return '0';
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--color-bg)] px-6">
        <p className="text-[var(--color-text-secondary)] mb-4">{error || 'Group not found'}</p>
        <button
          onClick={() => navigate('/home')}
          className="text-[var(--color-accent)] font-medium"
        >
          Go Home
        </button>
      </div>
    );
  }

  const title = group.type === 'direct' ? group.displayName : group.name;
  const includedCount = splitMembers.filter(m => m.included).length;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/95 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(`/group/${groupId}`)}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors font-medium text-[15px]"
          >
            Cancel
          </button>
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            Add Expense
          </span>
          <button
            onClick={handleSave}
            disabled={!amount || parseFloat(amount) <= 0 || isSaving}
            className={`text-[15px] font-semibold transition-colors ${
              amount && parseFloat(amount) > 0 && !isSaving
                ? 'text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]'
                : 'text-[var(--color-text-subtle)] cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : 'Done'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Amount Display */}
        <div className="flex flex-col items-center justify-center px-8 py-12">
          <div className="text-center mb-2">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-light text-[var(--color-text-muted)]">₹</span>
              <span className="text-6xl font-bold text-[var(--color-text-primary)] rupee tracking-tight">
                {formatAmount(amount)}
              </span>
            </div>
          </div>
          {error && (
            <p className="text-sm text-[var(--color-error)] mt-4 animate-fade-in">
              {error}
            </p>
          )}
        </div>

        {/* Details Section */}
        <div className="px-6 space-y-3 mb-6">
          {/* Description */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this for?"
              maxLength={100}
              className="w-full text-[15px] bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">Optional</p>
          </div>

          {/* Paid By */}
          <button
            onClick={() => setShowPaidByPicker(true)}
            className="w-full bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 text-left hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                  <span className="text-sm font-bold text-[#0a0a0b]">
                    {(selectedPayer?.name || selectedPayer?.phone || 'Y').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Paid by</p>
                  <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                    {selectedPayer?.id === user?.id ? 'You' : (selectedPayer?.name || selectedPayer?.phone)}
                  </p>
                </div>
              </div>
              <svg className="w-5 h-5 text-[var(--color-text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>

          {/* Split Settings */}
          <button
            onClick={() => setShowSplitCustomize(true)}
            className="w-full bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 text-left hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Split with</p>
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {includedCount} {includedCount === 1 ? 'person' : 'people'} · Equal split
                </p>
              </div>
              <svg className="w-5 h-5 text-[var(--color-text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        </div>

        {/* Number Pad */}
        <div className="px-6 pb-8 mt-auto">
          <div className="grid grid-cols-4 gap-3">
            {['1', '2', '3', '←'].map((key) => (
              <button
                key={key}
                onClick={() => key === '←' ? handleNumberPad('backspace') : handleNumberPad(key)}
                className="aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-2xl font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all"
              >
                {key === '←' ? '⌫' : key}
              </button>
            ))}
            {['4', '5', '6', 'AC'].map((key) => (
              <button
                key={key}
                onClick={() => key === 'AC' ? handleNumberPad('clear') : handleNumberPad(key)}
                className="aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-2xl font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all"
              >
                {key}
              </button>
            ))}
            {['7', '8', '9', '.'].map((key) => (
              <button
                key={key}
                onClick={() => handleNumberPad(key)}
                className="aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-2xl font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all"
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => handleNumberPad('0')}
              className="col-span-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-2xl font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all py-6"
            >
              0
            </button>
            <button
              onClick={handleSave}
              disabled={!amount || parseFloat(amount) <= 0 || isSaving}
              className={`rounded-2xl text-2xl font-bold transition-all py-6 ${
                amount && parseFloat(amount) > 0 && !isSaving
                  ? 'bg-[var(--color-accent)] text-[#0a0a0b] hover:bg-[var(--color-accent-hover)] active:scale-95'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-subtle)] cursor-not-allowed'
              }`}
            >
              ✓
            </button>
          </div>
        </div>
      </div>

      {/* Paid By Picker Modal */}
      {showPaidByPicker && (
        <div 
          className="fixed inset-0 z-50 flex items-end bg-black/60 animate-fade-in"
          onClick={() => setShowPaidByPicker(false)}
        >
          <div 
            className="w-full max-w-lg mx-auto bg-[var(--color-surface)] rounded-t-3xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Who paid?</h3>
              <button
                onClick={() => setShowPaidByPicker(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-auto">
              {group.members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    setSelectedPayer(member);
                    setShowPaidByPicker(false);
                  }}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    selectedPayer?.id === member.id
                      ? 'bg-[var(--color-accent-subtle)] border-2 border-[var(--color-accent)]'
                      : 'bg-[var(--color-surface-elevated)] border-2 border-transparent hover:border-[var(--color-border)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                      <span className="text-sm font-bold text-[#0a0a0b]">
                        {(member.name || member.phone).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {member.id === user?.id ? 'You' : (member.name || member.phone)}
                    </p>
                    {selectedPayer?.id === member.id && (
                      <svg className="w-5 h-5 text-[var(--color-accent)] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Split Customize Modal */}
      {showSplitCustomize && (
        <div 
          className="fixed inset-0 z-50 flex items-end bg-black/60 animate-fade-in"
          onClick={() => setShowSplitCustomize(false)}
        >
          <div 
            className="w-full max-w-lg mx-auto bg-[var(--color-surface)] rounded-t-3xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Split with</h3>
              <button
                onClick={() => setShowSplitCustomize(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-auto">
              {splitMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleToggleMember(member.id)}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    member.included
                      ? 'bg-[var(--color-accent-subtle)] border-2 border-[var(--color-accent)]'
                      : 'bg-[var(--color-surface-elevated)] border-2 border-transparent opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        member.included
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                          : 'border-[var(--color-border)]'
                      }`}>
                        {member.included && (
                          <svg className="w-4 h-4 text-[#0a0a0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {member.id === user?.id ? 'You' : (member.name || member.phone)}
                      </p>
                    </div>
                    {member.included && amount && (
                      <p className="text-sm font-semibold text-[var(--color-accent)]">
                        ₹{formatAmount(member.share.toString())}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSplitCustomize(false)}
              className="w-full mt-6 py-4 bg-[var(--color-accent)] text-[#0a0a0b] rounded-2xl font-semibold hover:bg-[var(--color-accent-hover)] active:scale-98 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

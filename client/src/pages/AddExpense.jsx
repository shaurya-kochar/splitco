import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getGroupDetails, createExpense } from "../api/groups";
import { useAuth } from "../context/AuthContext";

export default function AddExpense() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const amountInputRef = useRef(null);

  const [group, setGroup] = useState(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [showSplitCustomize, setShowSplitCustomize] = useState(false);
  const [payers, setPayers] = useState([]); // Array of {id, name, phone, amount}
  const [splitMembers, setSplitMembers] = useState([]);
  
  // Recurring expense state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('');
  const [customDays, setCustomDays] = useState('');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  useEffect(() => {
    loadGroup();
    
    // Check for URL parameters (from duplicate or recurring)
    const params = new URLSearchParams(location.search);
    const prefilledAmount = params.get('amount');
    const prefilledDescription = params.get('description');
    const recurring = params.get('recurring');
    
    if (prefilledAmount) setAmount(prefilledAmount);
    if (prefilledDescription) setDescription(prefilledDescription);
    if (recurring) {
      setIsRecurring(true);
      setRecurringFrequency(recurring);
      if (recurring !== 'custom') {
        setShowRecurringModal(false);
      } else {
        setShowRecurringModal(true);
      }
    }
  }, [groupId, location.search]);

  useEffect(() => {
    if (group && group.members) {
      // Initialize with current user as sole payer
      const currentUserMember =
        group.members.find((m) => m.id === user?.id) || group.members[0];
      setPayers([{ ...currentUserMember, amount: parseFloat(amount) || 0 }]);

      // Initialize all members in split with equal shares
      const numAmount = parseFloat(amount) || 0;
      const equalShare =
        numAmount > 0
          ? Number((numAmount / group.members.length).toFixed(2))
          : 0;
      setSplitMembers(
        group.members.map((member) => ({
          ...member,
          included: true,
          share: equalShare,
        }))
      );
    }
  }, [group, user]);

  useEffect(() => {
    // Recalculate equal splits when amount changes
    if (group && amount) {
      const numAmount = parseFloat(amount);
      if (numAmount > 0) {
        // Update payer amounts if single payer
        if (payers.length === 1) {
          setPayers([{ ...payers[0], amount: numAmount }]);
        }

        // Update split shares
        const includedCount = splitMembers.filter((m) => m.included).length;
        if (includedCount > 0) {
          const equalShare = Number((numAmount / includedCount).toFixed(2));
          setSplitMembers((prev) =>
            prev.map((member) => ({
              ...member,
              share: member.included ? equalShare : 0,
            }))
          );
        }
      }
    }
  }, [amount, group]);

  const loadGroup = async () => {
    try {
      const response = await getGroupDetails(groupId);
      setGroup(response.group);
    } catch (err) {
      setError("Failed to load group");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (value) => {
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      setError("");
    }
  };

  const handleNumberPad = (key) => {
    if (key === "backspace") {
      setAmount((prev) => prev.slice(0, -1));
    } else if (key === "clear") {
      setAmount("");
    } else if (key === ".") {
      if (!amount.includes(".")) {
        setAmount((prev) => prev + ".");
      }
    } else {
      setAmount((prev) => prev + key);
    }
  };

  const handleToggleMember = (memberId) => {
    setSplitMembers((prev) => {
      const updated = prev.map((m) =>
        m.id === memberId ? { ...m, included: !m.included } : m
      );

      // Recalculate equal split
      const numAmount = parseFloat(amount);
      if (numAmount > 0) {
        const includedCount = updated.filter((m) => m.included).length;
        if (includedCount > 0) {
          const equalShare = Number((numAmount / includedCount).toFixed(2));
          return updated.map((m) => ({
            ...m,
            share: m.included ? equalShare : 0,
          }));
        }
      }
      return updated;
    });
  };

  const handleUpdateSplitAmount = (memberId, newAmount) => {
    setSplitMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, share: Number(newAmount) || 0 } : m
    ));
  };

  const handleTogglePayer = (memberId) => {
    setPayers(prev => {
      const exists = prev.find(p => p.id === memberId);
      if (exists) {
        return prev.filter(p => p.id !== memberId);
      } else {
        const member = group.members.find(m => m.id === memberId);
        return [...prev, { ...member, amount: 0 }];
      }
    });
  };

  const handleUpdatePayerAmount = (payerId, newAmount) => {
    setPayers(prev => prev.map(p =>
      p.id === payerId ? { ...p, amount: Number(newAmount) || 0 } : p
    ));
  };

  const distributePaymentsEqually = () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount > 0 && payers.length > 0) {
      const equalAmount = Number((numAmount / payers.length).toFixed(2));
      setPayers(prev => prev.map(p => ({ ...p, amount: equalAmount })));
    }
  };

  const distributeSplitsEqually = () => {
    const numAmount = parseFloat(amount) || 0;
    const includedMembers = splitMembers.filter(m => m.included);
    if (numAmount > 0 && includedMembers.length > 0) {
      const equalShare = Number((numAmount / includedMembers.length).toFixed(2));
      setSplitMembers(prev => prev.map(m => ({
        ...m,
        share: m.included ? equalShare : 0
      })));
    }
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    if (payers.length === 0) {
      setError('Select at least one payer');
      return;
    }

    const totalPaid = payers.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - numAmount) > 0.01) {
      setError(`Total paid (₹${totalPaid.toFixed(2)}) must equal expense amount`);
      return;
    }

    const includedMembers = splitMembers.filter((m) => m.included);
    if (includedMembers.length === 0) {
      setError("Select at least one person to split with");
      return;
    }

    const totalSplit = includedMembers.reduce((sum, m) => sum + m.share, 0);
    if (Math.abs(totalSplit - numAmount) > 0.01) {
      setError(`Total split (₹${totalSplit.toFixed(2)}) must equal expense amount`);
      return;
    }
    
    // Validate recurring expense settings
    if (isRecurring) {
      if (recurringFrequency === 'custom' && (!customDays || customDays < 1)) {
        setError('Please specify valid custom interval days');
        return;
      }
    }

    setIsSaving(true);
    setError("");

    try {
      const splits = includedMembers.map((m) => ({
        userId: m.id,
        shareAmount: m.share,
      }));

      const paidByData = payers.length === 1
        ? { mode: 'single', userId: payers[0].id }
        : {
            mode: 'multiple',
            payments: payers.map(p => ({ userId: p.id, amount: p.amount }))
          };

      const expenseData = {
        amount: numAmount,
        description: description.trim() || null,
        paidBy: paidByData,
        splits,
      };
      
      // Add recurring data if enabled
      if (isRecurring) {
        expenseData.recurring = {
          frequency: recurringFrequency,
          customDays: recurringFrequency === 'custom' ? parseInt(customDays) : null,
          endDate: recurringEndDate || null
        };
      }

      await createExpense(groupId, expenseData);

      const successMessage = isRecurring 
        ? 'Recurring expense created successfully' 
        : 'Expense added';
      
      navigate(`/group/${groupId}`, {
        state: { expenseAdded: true, message: successMessage },
        replace: true,
      });
    } catch (err) {
      setError(err.message || "Failed to create expense");
      setIsSaving(false);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return "0";
    const num = parseFloat(amount);
    if (isNaN(num)) return "0";
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
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
        <p className="text-[var(--color-text-secondary)] mb-4">
          {error || "Group not found"}
        </p>
        <button
          onClick={() => navigate("/home")}
          className="text-[var(--color-accent)] font-medium"
        >
          Go Home
        </button>
      </div>
    );
  }

  const title = group.type === "direct" ? group.displayName : group.name;
  const includedCount = splitMembers.filter((m) => m.included).length;

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
                ? "text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                : "text-[var(--color-text-subtle)] cursor-not-allowed"
            }`}
          >
            {isSaving ? "Saving..." : "Done"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Amount Display */}
        <div className="flex flex-col items-center justify-center px-8 py-12">
          <div className="text-center mb-2">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-light text-[var(--color-text-muted)]">
                ₹
              </span>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    handleAmountChange(value);
                  }
                }}
                onFocus={(e) => e.target.select()}
                className="text-6xl font-bold text-[var(--color-text-primary)] rupee tracking-tight bg-transparent text-center outline-none max-w-[300px]"
                placeholder="0"
                style={{ width: `${Math.max(3, (amount || "0").length)}ch` }}
              />
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
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
              Optional
            </p>
          </div>

          {/* Paid By */}
          <button
            onClick={() => setShowPaidByPicker(true)}
            className="w-full bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 text-left hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Paid by</p>
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {payers.length === 0 ? 'Select payer(s)' : 
                   payers.length === 1 ? 
                     (payers[0].id === user?.id ? 'You' : (payers[0].name || payers[0].phone)) :
                     `${payers.length} people`}
                </p>
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
                <p className="text-xs text-[var(--color-text-muted)]">
                  Split with
                </p>
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {includedCount} {includedCount === 1 ? "person" : "people"} ·
                  Equal split
                </p>
              </div>
              <svg
                className="w-5 h-5 text-[var(--color-text-subtle)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </button>

          {/* Recurring Expense */}
          <button
            onClick={() => setShowRecurringModal(true)}
            className="w-full bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 text-left hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Repeat
                </p>
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {!isRecurring ? 'Does not repeat' : 
                   recurringFrequency === 'daily' ? 'Every day' :
                   recurringFrequency === 'weekly' ? 'Every week' :
                   recurringFrequency === 'monthly' ? 'Every month' :
                   recurringFrequency === 'yearly' ? 'Every year' :
                   customDays ? `Every ${customDays} days` : 'Custom'}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-[var(--color-text-subtle)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </button>
        </div>

        {/* Number Pad */}
        <div className="px-6 pb-8 mt-auto">
          <div className="grid grid-cols-4 gap-3">
            {["1", "2", "3", "←"].map((key) => (
              <button
                key={key}
                onClick={() =>
                  key === "←"
                    ? handleNumberPad("backspace")
                    : handleNumberPad(key)
                }
                className="aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-2xl font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all"
              >
                {key === "←" ? "⌫" : key}
              </button>
            ))}
            {["4", "5", "6", "AC"].map((key) => (
              <button
                key={key}
                onClick={() =>
                  key === "AC" ? handleNumberPad("clear") : handleNumberPad(key)
                }
                className="aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-2xl font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all"
              >
                {key}
              </button>
            ))}
            {["7", "8", "9", "."].map((key) => (
              <button
                key={key}
                onClick={() => handleNumberPad(key)}
                className="aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-2xl font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all"
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => handleNumberPad("0")}
              className="col-span-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-2xl font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all py-6"
            >
              0
            </button>
            <button
              onClick={handleSave}
              disabled={!amount || parseFloat(amount) <= 0 || isSaving}
              className={`rounded-2xl text-2xl font-bold transition-all py-6 ${
                amount && parseFloat(amount) > 0 && !isSaving
                  ? "bg-[var(--color-accent)] text-[#0a0a0b] hover:bg-[var(--color-accent-hover)] active:scale-95"
                  : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-subtle)] cursor-not-allowed"
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
            className="w-full max-w-lg mx-auto bg-[var(--color-surface)] rounded-t-3xl p-6 animate-slide-up max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Who paid?
              </h3>
              <button
                onClick={distributePaymentsEqually}
                className="text-sm text-[var(--color-accent)] font-semibold hover:underline"
              >
                Split Equally
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {group.members.map((member) => {
                const isPayer = payers.find(p => p.id === member.id);
                return (
                  <div key={member.id} className="bg-[var(--color-surface-elevated)] rounded-2xl p-4 border border-[var(--color-border)]">
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        onClick={() => handleTogglePayer(member.id)}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          isPayer
                            ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                            : "border-[var(--color-border)]"
                        }`}
                      >
                        {isPayer && (
                          <svg
                            className="w-4 h-4 text-[#0a0a0b]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                      <p className="font-medium text-[var(--color-text-primary)] flex-1">
                        {member.id === user?.id
                          ? "You"
                          : member.name || member.phone}
                      </p>
                    </div>
                    {isPayer && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--color-text-muted)]">₹</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={isPayer.amount || ''}
                          onChange={(e) => handleUpdatePayerAmount(member.id, e.target.value)}
                          className="flex-1 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {payers.length > 0 && (
              <div className="p-3 bg-[var(--color-accent-subtle)] rounded-xl mb-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Total paid: <span className="font-semibold text-[var(--color-text-primary)]">₹{payers.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
                  {amount && <span className="text-[var(--color-text-muted)]"> / ₹{parseFloat(amount).toFixed(2)}</span>}
                </p>
              </div>
            )}
            <button
              onClick={() => setShowPaidByPicker(false)}
              className="w-full py-4 bg-[var(--color-accent)] text-[#0a0a0b] rounded-2xl font-semibold hover:bg-[var(--color-accent-hover)] active:scale-98 transition-all"
            >
              Done
            </button>
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
            className="w-full max-w-lg mx-auto bg-[var(--color-surface)] rounded-t-3xl p-6 animate-slide-up max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Split with
              </h3>
              <button
                onClick={distributeSplitsEqually}
                className="text-sm text-[var(--color-accent)] font-semibold hover:underline"
              >
                Split Equally
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {splitMembers.map((member) => (
                <div key={member.id} className={`bg-[var(--color-surface-elevated)] rounded-2xl p-4 border border-[var(--color-border)] transition-opacity ${!member.included && 'opacity-50'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => handleToggleMember(member.id)}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        member.included
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                          : "border-[var(--color-border)]"
                      }`}
                    >
                      {member.included && (
                        <svg
                          className="w-4 h-4 text-[#0a0a0b]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                    <p className="font-medium text-[var(--color-text-primary)] flex-1">
                      {member.id === user?.id
                        ? "You"
                        : member.name || member.phone}
                    </p>
                  </div>
                  {member.included && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--color-text-muted)]">₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={member.share || ''}
                        onChange={(e) => handleUpdateSplitAmount(member.id, e.target.value)}
                        className="flex-1 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {splitMembers.filter(m => m.included).length > 0 && (
              <div className="p-3 bg-[var(--color-accent-subtle)] rounded-xl mb-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Total split: <span className="font-semibold text-[var(--color-text-primary)]">₹{splitMembers.filter(m => m.included).reduce((sum, m) => sum + m.share, 0).toFixed(2)}</span>
                  {amount && <span className="text-[var(--color-text-muted)]"> / ₹{parseFloat(amount).toFixed(2)}</span>}
                </p>
              </div>
            )}
            <button
              onClick={() => setShowSplitCustomize(false)}
              className="w-full py-4 bg-[var(--color-accent)] text-[#0a0a0b] rounded-2xl font-semibold hover:bg-[var(--color-accent-hover)] active:scale-98 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
      
      {/* Recurring Expense Modal */}
      {showRecurringModal && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 animate-fade-in"
          onClick={() => setShowRecurringModal(false)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-[var(--color-surface)] rounded-t-3xl p-6 animate-slide-up max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Repeat Expense
              </h3>
              <button
                onClick={() => {
                  setIsRecurring(false);
                  setRecurringFrequency('');
                  setCustomDays('');
                  setRecurringEndDate('');
                  setShowRecurringModal(false);
                }}
                className="text-sm text-[var(--color-accent)] font-semibold hover:underline"
              >
                Clear
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsRecurring(true);
                    setRecurringFrequency('daily');
                    setCustomDays('');
                  }}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                    recurringFrequency === 'daily'
                      ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
                      : 'bg-[var(--color-surface-elevated)] border-[var(--color-border)]'
                  }`}
                >
                  <p className="font-medium text-[var(--color-text-primary)]">Every day</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Expense will be added daily</p>
                </button>
                
                <button
                  onClick={() => {
                    setIsRecurring(true);
                    setRecurringFrequency('weekly');
                    setCustomDays('');
                  }}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                    recurringFrequency === 'weekly'
                      ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
                      : 'bg-[var(--color-surface-elevated)] border-[var(--color-border)]'
                  }`}
                >
                  <p className="font-medium text-[var(--color-text-primary)]">Every week</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Expense will be added every 7 days</p>
                </button>
                
                <button
                  onClick={() => {
                    setIsRecurring(true);
                    setRecurringFrequency('monthly');
                    setCustomDays('');
                  }}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                    recurringFrequency === 'monthly'
                      ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
                      : 'bg-[var(--color-surface-elevated)] border-[var(--color-border)]'
                  }`}
                >
                  <p className="font-medium text-[var(--color-text-primary)]">Every month</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Expense will be added monthly</p>
                </button>
                
                <button
                  onClick={() => {
                    setIsRecurring(true);
                    setRecurringFrequency('yearly');
                    setCustomDays('');
                  }}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                    recurringFrequency === 'yearly'
                      ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
                      : 'bg-[var(--color-surface-elevated)] border-[var(--color-border)]'
                  }`}
                >
                  <p className="font-medium text-[var(--color-text-primary)]">Every year</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Expense will be added yearly</p>
                </button>
                
                <div
                  className={`p-4 rounded-xl border-2 transition-all ${
                    recurringFrequency === 'custom'
                      ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
                      : 'bg-[var(--color-surface-elevated)] border-[var(--color-border)]'
                  }`}
                >
                  <button
                    onClick={() => {
                      setIsRecurring(true);
                      setRecurringFrequency('custom');
                    }}
                    className="w-full text-left mb-3"
                  >
                    <p className="font-medium text-[var(--color-text-primary)]">Custom interval</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Specify number of days</p>
                  </button>
                  {recurringFrequency === 'custom' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--color-text-secondary)]">Every</span>
                      <input
                        type="number"
                        min="1"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                        placeholder="7"
                      />
                      <span className="text-sm text-[var(--color-text-secondary)]">days</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* End Date */}
              {isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Repeat until (optional)
                  </label>
                  <input
                    type="date"
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    Leave empty to repeat indefinitely
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowRecurringModal(false)}
              className="w-full py-4 bg-[var(--color-accent)] text-[#0a0a0b] rounded-2xl font-semibold hover:bg-[var(--color-accent-hover)] active:scale-98 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

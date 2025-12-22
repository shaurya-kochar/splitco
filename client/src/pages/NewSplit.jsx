import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { createDirectSplit } from '../api/groups';

export default function NewSplit() {
  const [view, setView] = useState('choice'); // 'choice' | 'person' | 'group'
  const [phone, setPhone] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const isPhoneValid = phone.length === 10 && /^\d+$/.test(phone);
  const isGroupValid = groupName.trim().length > 0 && groupName.trim().length <= 50;

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(value);
    setError('');
  };

  const handlePersonSubmit = async (e) => {
    e.preventDefault();
    if (!isPhoneValid || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await createDirectSplit(`+91${phone}`);
      navigate(`/group/${response.group.id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to start split');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    if (!isGroupValid || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const { createGroup } = await import('../api/groups');
      const response = await createGroup(groupName.trim());
      navigate(`/group/${response.group.id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  if (view === 'choice') {
    return (
      <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
        <header className="px-6 pt-6 pb-4">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface-elevated)] transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                Start New Split
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Choose how you want to split
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col px-6 pt-8 max-w-lg mx-auto w-full">
          <div className="space-y-4 animate-fade-in">
            <button
              onClick={() => setView('person')}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 text-left hover:bg-[var(--color-surface-elevated)] hover:border-[var(--color-accent)] transition-all active:scale-[0.98] shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#60a5fa] to-[#3b82f6] flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
                    With a Person
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Split expenses one-on-one
                  </p>
                </div>
                <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>

            <button
              onClick={() => setView('group')}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 text-left hover:bg-[var(--color-surface-elevated)] hover:border-[var(--color-accent)] transition-all active:scale-[0.98] shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
                    Create a Group
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Split with multiple people
                  </p>
                </div>
                <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'group') {
    return (
      <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
        <header className="px-6 pt-6 pb-4">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <button
              onClick={() => setView('choice')}
              className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface-elevated)] transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              New Group
            </h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col px-6 pt-8 max-w-lg mx-auto w-full">
          <form onSubmit={handleGroupSubmit} className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Group name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setError('');
                }}
                placeholder="e.g., Trip to Goa"
                maxLength={50}
                disabled={isLoading}
                autoFocus
                className={`w-full py-4 px-4 bg-[var(--color-surface)] border rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors disabled:opacity-50 ${
                  error 
                    ? 'border-[var(--color-error)]' 
                    : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'
                }`}
              />
              {error && (
                <p className="text-sm text-[var(--color-error)] mt-2">{error}</p>
              )}
              <p className="text-xs text-[var(--color-text-muted)] mt-2 text-right">
                {groupName.length}/50
              </p>
            </div>

            <button
              type="submit"
              disabled={!isGroupValid || isLoading}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all duration-200 shadow-[var(--shadow-md)] ${
                isGroupValid && !isLoading
                  ? 'bg-[var(--color-accent)] text-[#0a0a0b] hover:bg-[var(--color-accent-hover)] active:scale-[0.98]'
                  : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-[#0a0a0b]/30 border-t-[#0a0a0b] rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Group'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <header className="px-6 pt-6 pb-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => setView('choice')}
            className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Split with Person
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col px-6 pt-8 max-w-lg mx-auto w-full">
        <p className="text-[var(--color-text-secondary)] mb-6">
          Enter the phone number of the person you want to split expenses with.
        </p>

        <form onSubmit={handlePersonSubmit} className="space-y-6 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Phone number
            </label>
            <div className={`flex items-center bg-[var(--color-surface)] border rounded-xl overflow-hidden transition-colors ${
              error 
                ? 'border-[var(--color-error)]' 
                : 'border-[var(--color-border)] focus-within:border-[var(--color-accent)]'
            }`}>
              <span className="pl-4 pr-2 text-[var(--color-text-secondary)] font-medium">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="Enter phone number"
                disabled={isLoading}
                autoFocus
                className="flex-1 py-4 pr-4 bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--color-error)] mt-2">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isPhoneValid || isLoading}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all duration-200 shadow-[var(--shadow-md)] ${
              isPhoneValid && !isLoading
                ? 'bg-[var(--color-accent)] text-[#0a0a0b] hover:bg-[var(--color-accent-hover)] active:scale-[0.98]'
                : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-[#0a0a0b]/30 border-t-[#0a0a0b] rounded-full animate-spin" />
                Starting...
              </span>
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

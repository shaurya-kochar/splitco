import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGroupDetails } from '../api/groups';

export default function GroupInfo() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGroup = async () => {
      try {
        setIsLoading(true);
        const res = await getGroupDetails(groupId);
        setGroup(res.group);
      } catch (err) {
        setError(err.message || 'Failed to load group info');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGroup();
  }, [groupId]);

  const formatPhone = (phone) => {
    // +919876543210 -> +91 98765 43210
    if (phone.startsWith('+91')) {
      const number = phone.slice(3);
      return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
    }
    return phone;
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
        <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
          <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
              Group Info
            </h1>
            <div className="w-6" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-text-muted)]/30 border-t-[var(--color-text-muted)] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
        <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
          <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
              Group Info
            </h1>
            <div className="w-6" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-[var(--color-error)] mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDirectSplit = group.type === 'direct';
  const title = isDirectSplit ? group.displayName : group.name;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
            Group Info
          </h1>
          <div className="w-6" />
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full">
        {/* Group Name */}
        <div className="px-6 py-6 border-b border-[var(--color-border-subtle)]">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-1">
            {title}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
          </p>
        </div>

        {/* Members List */}
        <div className="px-6 py-4">
          <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
            Members
          </h3>
          <div className="space-y-4">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 py-2"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-base font-medium text-[var(--color-text-secondary)] shrink-0">
                  {(member.name || member.phone).slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)] truncate">
                    {member.name || 'No name'}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] truncate">
                    {formatPhone(member.phone)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

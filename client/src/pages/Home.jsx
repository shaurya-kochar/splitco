import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups } from '../api/groups';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    // Check if user needs to join a group after login
    const joinUrl = sessionStorage.getItem('joinAfterLogin');
    if (joinUrl) {
      sessionStorage.removeItem('joinAfterLogin');
      navigate(joinUrl, { replace: true });
      return;
    }
    
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await getGroups();
      setGroups(response.groups || []);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const groupList = groups.filter(g => g.type === 'group');
  const directList = groups.filter(g => g.type === 'direct');
  const hasContent = groupList.length > 0 || directList.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
            SplitCo
          </h1>
          <button
            onClick={logout}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Action Buttons */}
        <div className="px-6 py-5 flex gap-3">
          <button
            onClick={() => navigate('/create-group')}
            className="flex-1 py-3.5 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent-subtle)] transition-all duration-200 shadow-[var(--shadow-sm)]"
          >
            New Group
          </button>
          <button
            onClick={() => navigate('/new-split')}
            className="flex-1 py-3.5 px-4 bg-[var(--color-accent)] rounded-xl text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all duration-200 shadow-[var(--shadow-md)]"
          >
            New Split
          </button>
        </div>

        {!hasContent ? (
          // Empty State
          <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
            <div className="animate-fade-in text-center">
              <div className="w-18 h-18 mx-auto mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center justify-center shadow-[var(--shadow-sm)]" style={{ width: 72, height: 72 }}>
                <svg 
                  className="w-8 h-8 text-[var(--color-text-muted)]"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" 
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                No groups yet
              </h2>
              <p className="text-[var(--color-text-secondary)] leading-relaxed max-w-[260px] mx-auto">
                Create a group or start a split with someone
              </p>
            </div>
          </div>
        ) : (
          // Content
          <div className="flex-1 overflow-auto px-6 pb-8">
            {/* Groups Section */}
            {groupList.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
                  Groups
                </h2>
                <div className="space-y-2">
                  {groupList.map((group, index) => (
                    <button
                      key={group.id}
                      onClick={() => navigate(`/group/${group.id}`)}
                      className="w-full card card-interactive p-4 text-left animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--color-accent-subtle)] rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)]">{group.name}</p>
                            <p className="text-sm text-[var(--color-text-muted)]">
                              {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                            </p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-[var(--color-text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* People Section */}
            {directList.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
                  People
                </h2>
                <div className="space-y-2">
                  {directList.map((group, index) => (
                    <button
                      key={group.id}
                      onClick={() => navigate(`/group/${group.id}`)}
                      className="w-full card card-interactive p-4 text-left animate-fade-in"
                      style={{ animationDelay: `${(groupList.length + index) * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--color-accent-subtle)] rounded-full flex items-center justify-center text-sm font-medium text-[var(--color-text-secondary)]">
                            {(group.displayName || '?').slice(0, 1).toUpperCase()}
                          </div>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {group.displayName}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-[var(--color-text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

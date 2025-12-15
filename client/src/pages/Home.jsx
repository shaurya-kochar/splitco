import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getGroups } from '../api/groups';

export default function Home() {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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
      <Layout showLogout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showLogout>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Action Buttons */}
        <div className="px-6 py-4 flex gap-3">
          <button
            onClick={() => navigate('/create-group')}
            className="flex-1 py-3 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors"
          >
            New Group
          </button>
          <button
            onClick={() => navigate('/new-split')}
            className="flex-1 py-3 px-4 bg-[var(--color-accent)] rounded-xl text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            New Split
          </button>
        </div>

        {!hasContent ? (
          // Empty State
          <div className="flex-1 flex flex-col justify-center items-center px-6">
            <div className="animate-fade-in text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center justify-center">
                <svg 
                  className="w-10 h-10 text-[var(--color-text-muted)]"
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
              <p className="text-[var(--color-text-secondary)]">
                Create a group or start a split with someone
              </p>
            </div>
          </div>
        ) : (
          // Content
          <div className="flex-1 overflow-auto px-6 pb-6">
            {/* Groups Section */}
            {groupList.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 uppercase tracking-wide">
                  Groups
                </h2>
                <div className="space-y-2">
                  {groupList.map(group => (
                    <button
                      key={group.id}
                      onClick={() => navigate(`/group/${group.id}`)}
                      className="w-full p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-left hover:bg-[var(--color-bg)] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--color-bg)] rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                        <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 uppercase tracking-wide">
                  People
                </h2>
                <div className="space-y-2">
                  {directList.map(group => (
                    <button
                      key={group.id}
                      onClick={() => navigate(`/group/${group.id}`)}
                      className="w-full p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-left hover:bg-[var(--color-bg)] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--color-bg)] rounded-full flex items-center justify-center text-sm font-medium text-[var(--color-text-secondary)]">
                            {(group.displayName || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {group.displayName}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
    </Layout>
  );
}

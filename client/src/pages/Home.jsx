import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups } from '../api/groups';
import { useAuth } from '../context/AuthContext';
import DevModeWarning from '../components/DevModeWarning';
import HeroCard from '../components/HeroCard';
import BottomNav from '../components/BottomNav';

export default function Home() {
  const [groups, setGroups] = useState([]);
  const [netBalance, setNetBalance] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalSplits, setTotalSplits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  useEffect(() => {
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
      const groupsData = response.groups || [];
      setGroups(groupsData);
      
      // Calculate aggregated stats
      let balance = 0;
      let expenses = 0;
      let splits = 0;
      
      groupsData.forEach(group => {
        if (group.currentUserBalance != null) {
          balance += group.currentUserBalance;
        }
        if (group.expenseCount != null) {
          expenses += group.expenseCount;
        }
        splits += 1;
      });
      
      setNetBalance(balance);
      setTotalExpenses(expenses);
      setTotalSplits(splits);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  const groupList = groups.filter(g => g.type === 'group');
  const directList = groups.filter(g => g.type === 'direct');
  const hasContent = groupList.length > 0 || directList.length > 0;
  const allMembers = groups.flatMap(g => g.members || []).filter((m, i, arr) => 
    arr.findIndex(member => member.id === m.id) === i
  );

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <DevModeWarning />
      
      {/* Header */}
      <header className="px-6 pt-4 pb-2">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#60a5fa] to-[#3b82f6] flex items-center justify-center border-2 border-[var(--color-surface)]">
            <span className="text-sm font-bold text-white">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface-elevated)] transition-colors">
              <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
            <button className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface-elevated)] transition-colors relative">
              <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#ef4444] rounded-full border border-[var(--color-bg)]"></span>
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 pt-2 pb-1">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
          Hello, {user?.name?.split(' ')[0] || 'User'}👋
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Split your bill with your friends and family!
        </p>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full pb-28">
        {hasContent && (
          <div className="px-6 pt-4 pb-2">
            <HeroCard
              balance={netBalance}
              type="balance"
              members={allMembers.slice(0, 3)}
              splitCount={totalSplits}
              expenseCount={totalExpenses}
            />
          </div>
        )}

        {!hasContent ? (
          <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
            <div className="animate-fade-in text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl flex items-center justify-center">
                <svg 
                  className="w-10 h-10 text-[var(--color-accent)]"
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
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
                No groups yet
              </h2>
              <p className="text-[var(--color-text-secondary)] leading-relaxed max-w-[280px] mx-auto mb-8">
                Create a group or start a split with someone to begin tracking expenses
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="px-6 pt-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                  Split Bill History
                </h2>
                <button className="text-sm font-semibold text-[var(--color-accent)]">
                  See more
                </button>
              </div>
              
              <div className="space-y-3">
                {groupList.map((group, index) => (
                  <button
                    key={group.id}
                    onClick={() => navigate(`/group/${group.id}`)}
                    className="w-full bg-[var(--color-surface)] rounded-2xl p-4 text-left hover:bg-[var(--color-surface-elevated)] transition-all duration-200 border border-[var(--color-border)] press-effect animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-[var(--color-accent)]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm15 0h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v8h-3v-8z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--color-text-primary)] text-base mb-1">{group.name}</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center -space-x-2">
                            {(group.members || []).slice(0, 3).map((member, i) => (
                              <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-[var(--color-surface)] flex items-center justify-center">
                                <span className="text-[10px] font-medium text-white">
                                  {(member.name || member.phone || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            ))}
                            {(group.members || []).length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-[var(--color-surface-elevated)] border-2 border-[var(--color-surface)] flex items-center justify-center">
                                <span className="text-[10px] font-medium text-[var(--color-accent)]">
                                  +{(group.members || []).length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-[var(--color-accent)] font-semibold">
                            75% Paid
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#0a0a0b] bg-[var(--color-accent)] px-3 py-1 rounded-full">
                          {formatAmount(Math.abs(group.currentUserBalance || 0))}
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <button className="w-full text-sm font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-lg py-2 hover:bg-[var(--color-surface-elevated)] transition-colors">
                      View Details
                    </button>
                  </button>
                ))}
              </div>

              {directList.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-4 mt-6">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                      People
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {directList.map((group, index) => (
                      <button
                        key={group.id}
                        onClick={() => navigate(`/group/${group.id}`)}
                        className="w-full bg-[var(--color-surface)] rounded-2xl p-4 text-left hover:bg-[var(--color-surface-elevated)] transition-all duration-200 border border-[var(--color-border)] press-effect animate-fade-in"
                        style={{ animationDelay: `${(groupList.length + index) * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-sm font-semibold text-white">
                            {(group.displayName || '?').slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-[var(--color-text-primary)] text-base">
                              {group.displayName}
                            </p>
                            {group.currentUserBalance != null && group.currentUserBalance !== 0 && (
                              <p className={`text-sm font-medium ${
                                group.currentUserBalance > 0 
                                  ? 'text-[var(--color-success)]' 
                                  : 'text-[var(--color-error)]'
                              }`}>
                                {group.currentUserBalance > 0 ? 'Owes you ' : 'You owe '}
                                {formatAmount(group.currentUserBalance)}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-3">
        <button
          onClick={() => navigate('/new-split')}
          className="w-14 h-14 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-all press-effect"
          title="Quick Split"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </button>
        <button
          onClick={() => navigate('/create-group')}
          className="w-14 h-14 rounded-full bg-[var(--color-accent)] shadow-lg flex items-center justify-center text-[#0a0a0b] hover:bg-[var(--color-accent-hover)] transition-all press-effect"
          title="Create Group"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

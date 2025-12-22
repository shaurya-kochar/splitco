import { useState, useEffect } from 'react';
import { getGroups } from '../api/groups';
import BottomNav from '../components/BottomNav';

export default function Analytics() {
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalOwed: 0,
    totalOwe: 0,
    groupCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await getGroups();
      const groups = response.groups || [];
      
      let totalSpent = 0;
      let totalOwed = 0;
      let totalOwe = 0;
      
      groups.forEach(group => {
        if (group.currentUserBalance > 0) {
          totalOwed += group.currentUserBalance;
        } else if (group.currentUserBalance < 0) {
          totalOwe += Math.abs(group.currentUserBalance);
        }
        totalSpent += group.totalExpenses || 0;
      });
      
      setStats({
        totalSpent,
        totalOwed,
        totalOwe,
        groupCount: groups.length
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
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
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/95 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center">
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Analytics
          </h1>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full pb-28 px-6 py-6">
        <div className="animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">You Get Back</p>
              <p className="text-2xl font-bold text-[var(--color-success)]">
                {formatAmount(stats.totalOwed)}
              </p>
            </div>
            <div className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">You Owe</p>
              <p className="text-2xl font-bold text-[var(--color-error)]">
                {formatAmount(stats.totalOwe)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Overview
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">Active Groups</span>
                <span className="font-semibold text-[var(--color-text-primary)]">{stats.groupCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">Net Balance</span>
                <span className={`font-semibold ${stats.totalOwed - stats.totalOwe >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                  {stats.totalOwed - stats.totalOwe >= 0 ? '+' : '-'}
                  {formatAmount(Math.abs(stats.totalOwed - stats.totalOwe))}
                </span>
              </div>
            </div>
          </div>

          {/* Chart placeholder */}
          <div className="mt-6 bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Spending Insights
            </h2>
            <div className="h-40 flex items-center justify-center">
              <p className="text-[var(--color-text-muted)] text-sm">
                Charts coming soon
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups } from '../api/groups';
import BottomNav from '../components/BottomNav';

export default function History() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await getGroups();
      const groups = response.groups || [];
      // Collect expenses from all groups (simplified - in production you'd have a dedicated API)
      const allExpenses = [];
      groups.forEach(group => {
        if (group.recentExpenses) {
          allExpenses.push(...group.recentExpenses.map(e => ({ ...e, groupName: group.name })));
        }
      });
      setExpenses(allExpenses);
    } catch (err) {
      console.error('Failed to load history:', err);
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
            History
          </h1>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full pb-28">
        {expenses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-20">
            <div className="animate-fade-in text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl flex items-center justify-center">
                <svg className="w-10 h-10 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
                No history yet
              </h2>
              <p className="text-[var(--color-text-secondary)] leading-relaxed max-w-[280px] mx-auto">
                Your expense history will appear here once you start splitting bills
              </p>
            </div>
          </div>
        ) : (
          <div className="px-6 py-6">
            <div className="space-y-3">
              {expenses.map((expense, index) => (
                <div
                  key={expense.id || index}
                  className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {expense.description || 'Expense'}
                      </p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {expense.groupName}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">
                      {formatAmount(expense.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { getGroupDetails } from '../api/groups';
import { useAuth } from '../context/AuthContext';

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    try {
      setIsLoading(true);
      const response = await getGroupDetails(groupId);
      setGroup(response.group);
    } catch (err) {
      setError(err.message || 'Failed to load group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    const inviteUrl = `${window.location.origin}/join/${groupId}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setToastMessage('Invite link copied');
      setShowToast(true);
    } catch {
      // Fallback for browsers that don't support clipboard API
      setToastMessage(inviteUrl);
      setShowToast(true);
    }
  };

  const handleAddExpense = () => {
    setToastMessage('Coming in next phase');
    setShowToast(true);
  };

  if (isLoading) {
    return (
      <Layout showBack backTo="/home">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !group) {
    return (
      <Layout showBack backTo="/home">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-[var(--color-text-secondary)] mb-4">{error || 'Group not found'}</p>
          <Button onClick={() => navigate('/home')}>Go Home</Button>
        </div>
      </Layout>
    );
  }

  const isDirectSplit = group.type === 'direct';
  const title = isDirectSplit ? group.displayName : group.name;

  return (
    <Layout showBack backTo="/home" title={title}>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Members Section */}
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--color-text-secondary)]">
              {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
            </span>
            {!isDirectSplit && (
              <button
                onClick={handleInvite}
                className="text-sm font-medium text-[var(--color-accent)] hover:opacity-80 transition-opacity"
              >
                Invite
              </button>
            )}
          </div>
          
          <div className="flex -space-x-2 overflow-hidden">
            {group.members.slice(0, 5).map((member, index) => (
              <div
                key={member.id}
                className="w-10 h-10 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-bg)] flex items-center justify-center text-sm font-medium text-[var(--color-text-secondary)]"
                title={member.name || member.phone}
              >
                {(member.name || member.phone).slice(0, 2).toUpperCase()}
              </div>
            ))}
            {group.members.length > 5 && (
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-bg)] flex items-center justify-center text-xs font-medium text-[var(--color-text-muted)]">
                +{group.members.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center justify-center">
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
                  d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" 
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-1">
              No expenses yet
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Add an expense to start tracking
            </p>
          </div>
        </div>

        {/* Add Expense Button */}
        <div className="p-6 border-t border-[var(--color-border)]">
          <Button onClick={handleAddExpense} disabled>
            Add Expense
          </Button>
        </div>
      </div>

      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </Layout>
  );
}

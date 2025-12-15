import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { joinGroup } from '../api/groups';

export default function JoinGroup() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !joined && !isJoining) {
      handleJoin();
    }
  }, [user, authLoading, joined, isJoining]);

  const handleJoin = async () => {
    if (isJoining) return;
    
    setIsJoining(true);
    setError('');

    try {
      await joinGroup(groupId);
      setJoined(true);
      // Navigate to the group after a brief moment
      setTimeout(() => {
        navigate(`/group/${groupId}`, { replace: true });
      }, 500);
    } catch (err) {
      setError(err.message || 'Failed to join group');
      setIsJoining(false);
    }
  };

  // If not logged in, redirect to login with return URL
  if (!authLoading && !user) {
    // Store the join URL to redirect back after login
    sessionStorage.setItem('joinAfterLogin', `/join/${groupId}`);
    navigate('/', { replace: true });
    return null;
  }

  if (authLoading || isJoining) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            {authLoading ? 'Loading...' : 'Joining group...'}
          </p>
        </div>
      </Layout>
    );
  }

  if (joined) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[var(--color-text-primary)] font-medium">Joined successfully!</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
          <Button onClick={() => navigate('/home')}>Go Home</Button>
        </div>
      </Layout>
    );
  }

  return null;
}

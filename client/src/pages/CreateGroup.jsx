import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { createGroup } from '../api/groups';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const isValid = name.trim().length > 0 && name.trim().length <= 50;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await createGroup(name.trim());
      navigate(`/group/${response.group.id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout showBack backTo="/home" title="New Group">
      <div className="flex-1 flex flex-col px-6 pt-8 max-w-lg mx-auto w-full">
        <div className="animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Group name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="e.g., Trip to Goa"
                maxLength={50}
                disabled={isLoading}
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
                {name.length}/50
              </p>
            </div>

            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Group'
              )}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

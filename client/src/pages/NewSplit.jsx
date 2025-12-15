import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { createDirectSplit } from '../api/groups';

export default function NewSplit() {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const isValid = phone.length === 10 && /^\d+$/.test(phone);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

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

  return (
    <Layout showBack backTo="/home" title="New Split">
      <div className="flex-1 flex flex-col px-6 pt-8 max-w-lg mx-auto w-full">
        <div className="animate-fade-in">
          <p className="text-[var(--color-text-secondary)] mb-6">
            Enter the phone number of the person you want to split expenses with.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="flex-1 py-4 pr-4 bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
                />
              </div>
              {error && (
                <p className="text-sm text-[var(--color-error)] mt-2">{error}</p>
              )}
            </div>

            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

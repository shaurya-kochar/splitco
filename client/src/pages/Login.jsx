import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { sendOtp } from '../api/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const isValidPhone = phone.length === 10 && /^\d+$/.test(phone);
  const isValidUsername = username.trim().length >= 2;

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(value);
    setError('');
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!isValidPhone || !isValidUsername || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const fullPhone = `+91${phone}`;
      await sendOtp(fullPhone);
      navigate('/verify', { 
        state: { 
          phone: fullPhone,
          username: username.trim(),
          email: email.trim() || null
        } 
      });
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col justify-center px-6 max-w-lg mx-auto w-full">
        <div className="animate-fade-in">
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
              Welcome to SplitCo
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              Split and settle expenses effortlessly
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleContinue} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Your name
              </label>
              <input
                type="text"
                autoComplete="name"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="Enter your name"
                maxLength={50}
                disabled={isLoading}
                className={`w-full py-4 px-4 bg-[var(--color-surface)] border rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors disabled:opacity-50 ${
                  error 
                    ? 'border-[var(--color-error)]' 
                    : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Phone number
              </label>
              <div className={`flex items-center bg-[var(--color-surface)] border rounded-xl overflow-hidden transition-colors ${
                error ? 'border-[var(--color-error)]' : 'border-[var(--color-border)] focus-within:border-[var(--color-accent)]'
              }`}>
                <span className="pl-4 pr-2 text-[var(--color-text-secondary)] font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Enter your phone number"
                  disabled={isLoading}
                  className="flex-1 py-4 pr-4 bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
                />
              </div>
              {error && (
                <p className="text-sm text-[var(--color-error)] mt-2">{error}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Email <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="your@email.com"
                disabled={isLoading}
                className="w-full py-4 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] transition-colors disabled:opacity-50"
              />
            </div>

            <Button type="submit" disabled={!isValidPhone || !isValidUsername || isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending code...
                </span>
              ) : (
                'Continue'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-[var(--color-text-muted)] mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </Layout>
  );
}

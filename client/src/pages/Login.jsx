import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-accent)] rounded-3xl flex items-center justify-center">
            <svg className="w-8 h-8 text-[#0a0a0b]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm15 0h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v8h-3v-8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            Welcome to SplitCo
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Premium bill splitting for friends and family
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center px-4">
        <form onSubmit={handleContinue} className="max-w-md mx-auto w-full space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
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
              className={`w-full py-4 px-4 bg-[var(--color-surface)] border rounded-2xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 ${
                error 
                  ? 'border-[var(--color-error)]' 
                  : 'border-[var(--color-border)]'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Phone number
            </label>
            <div className={`flex items-center bg-[var(--color-surface)] border rounded-2xl overflow-hidden transition-colors ${
              error ? 'border-[var(--color-error)]' : 'border-[var(--color-border)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/50'
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
                className="flex-1 py-4 pr-4 bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] disabled:opacity-50 focus:outline-none"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--color-error)] mt-2">{error}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Email <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span>
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
              className="w-full py-4 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
            />
          </div>

          <button 
            type="submit" 
            disabled={!isValidPhone || !isValidUsername || isLoading}
            className="w-full h-14 rounded-2xl bg-[var(--color-accent)] text-[#0a0a0b] text-lg font-bold press-effect disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#0a0a0b]/30 border-t-[#0a0a0b] rounded-full animate-spin" />
                Sending code...
              </span>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--color-text-secondary)] mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

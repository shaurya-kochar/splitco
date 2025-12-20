import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { verifyOtp, sendOtp } from '../api/auth';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function Verify() {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const phone = location.state?.phone;
  const username = location.state?.username;
  const email = location.state?.email;

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  if (!phone) {
    return <Navigate to="/" replace />;
  }

  // Mask phone: show first 2 and last 2 digits
  const phoneDigits = phone.replace('+91', '');
  const maskedPhone = phoneDigits.slice(0, 2) + 'XXXXXX' + phoneDigits.slice(-2);
  const otpValue = otp.join('');
  const isComplete = otpValue.length === OTP_LENGTH;

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    
    // Handle paste
    if (value.length > 1) {
      const digits = value.slice(0, OTP_LENGTH).split('');
      digits.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-advance
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!isComplete || isVerifying) return;

    setIsVerifying(true);
    setError('');

    try {
      const response = await verifyOtp(phone, otpValue, username, email);
      login(response.user);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
      triggerShake();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;

    setIsResending(true);
    setError('');
    setOtp(Array(OTP_LENGTH).fill(''));

    try {
      await sendOtp(phone);
      setResendTimer(RESEND_COOLDOWN);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col justify-center px-6 max-w-lg mx-auto w-full">
        <div className="animate-fade-in">
          {/* OTP Input */}
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
              Verify your number
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              Enter the 6-digit code sent to +91 {maskedPhone}
            </p>
          </div>

          {/* OTP Form */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <div 
                className={`flex justify-center gap-3 ${isShaking ? 'animate-shake' : ''}`}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isVerifying}
                    className={`w-12 h-14 text-center text-xl font-semibold bg-[var(--color-surface)] border rounded-xl transition-colors disabled:opacity-50 ${
                      error 
                        ? 'border-[var(--color-error)]' 
                        : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'
                    }`}
                  />
                ))}
              </div>
              
              {error && (
                <p className="text-center text-sm text-[var(--color-error)] mt-3">
                  {error}
                </p>
              )}
            </div>

            <Button type="submit" disabled={!isComplete || isVerifying}>
              {isVerifying ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify'
              )}
            </Button>
          </form>

          {/* Resend */}
          <div className="text-center mt-6">
            {resendTimer > 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Resend code in {resendTimer}s
              </p>
            ) : (
              <button 
                onClick={handleResend}
                disabled={isResending}
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
              >
                {isResending ? (
                  'Sending...'
                ) : (
                  <>Didn't receive the code? <span className="font-medium">Resend</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

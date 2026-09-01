import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  MapPin, 
  Building2, 
  Globe, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Phone,
  Eye,
  EyeOff,
  Inbox,
  Loader2
} from 'lucide-react';
import { 
  checkRateLimit, 
  recordFailedAttempt, 
  resetAttempts, 
  sanitizeInput, 
  evaluatePasswordStrength 
} from '../utils/security';
import { ALL_COUNTRIES } from '../data/countries';

export const AuthModal: React.FC = () => {
  const {
    t,
    language,
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginUser,
    registerUser,
    resetUserPassword,
    theme,
    addToast,
  } = useStore();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [viewMode, setViewMode] = useState<'auth' | 'forgot'>('auth');
  
  // Registration Multi-Step State: 1 = Personal & Security, 2 = Address & Region, 3 = Email Verification (OTP)
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot Password / Recovery State
  const [forgotEmail, setForgotEmail] = useState('');
  const [failedAttemptsMap, setFailedAttemptsMap] = useState<Record<string, number>>({});
  const [isSendingTempPass, setIsSendingTempPass] = useState<boolean>(false);
  const [tempPassSentTo, setTempPassSentTo] = useState<string | null>(null);
  
  // Address Fields
  const [country, setCountry] = useState('Georgia');
  const [city, setCity] = useState('Tbilisi');
  const [zip, setZip] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  // OTP 5-digit verification state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Security / Lockout State
  const [lockoutSec, setLockoutSec] = useState<number>(0);

  // Password Strength
  const pwdStrength = evaluatePasswordStrength(password);

  // Password Strength Label
  const getStrengthLabel = (score: number) => {
    switch (score) {
      case 1:
        return t('auth.strength.weak');
      case 2:
        return t('auth.strength.medium');
      case 3:
        return t('auth.strength.strong');
      case 4:
        return t('auth.strength.veryStrong');
      default:
        return '';
    }
  };

  // Clean and reset all sensitive input states whenever modal opens, closes, or switches tabs
  useEffect(() => {
    if (!isAuthModalOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setCountry('Georgia');
      setCity('Tbilisi');
      setZip('');
      setAddress('');
      setPhone('');
      setOtpDigits(['', '', '', '', '']);
      setVerificationError(null);
      setRegStep(1);
      setViewMode('auth');
      setTempPassSentTo(null);
    }
  }, [isAuthModalOpen]);

  const handleTabSwitch = (newTab: 'login' | 'register') => {
    setTab(newTab);
    setViewMode('auth');
    setRegStep(1);
    setPassword('');
    setConfirmPassword('');
    setOtpDigits(['', '', '', '', '']);
    setVerificationError(null);
    setTempPassSentTo(null);
  };

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSec > 0) {
      const timer = setInterval(() => {
        setLockoutSec(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSec]);

  // Countdown timer for OTP Resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  if (!isAuthModalOpen) return null;

  // Send 5-digit OTP via server to recipient's email address
  const sendNewOtp = async (recipientEmail: string) => {
    const cleanEmail = sanitizeInput(recipientEmail).toLowerCase();
    setIsSendingOtp(true);
    setVerificationError(null);
    setOtpDigits(['', '', '', '', '']);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: sanitizeInput(name) || 'Customer',
          language,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setResendCooldown(45);
        addToast(t('auth.codeSentToast'), 'info');
      } else {
        const errorMsg = data.error || 'Failed to dispatch verification code';
        setVerificationError(errorMsg);
        addToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      setResendCooldown(45);
      addToast(t('auth.codeSentToast'), 'info');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(email).toLowerCase();

    // Check rate limit
    const limit = checkRateLimit(cleanEmail);
    if (!limit.allowed && limit.waitSeconds) {
      setLockoutSec(limit.waitSeconds);
      addToast(t('auth.lockoutWarning', { sec: String(limit.waitSeconds) }), 'error');
      return;
    }

    const success = loginUser(cleanEmail, 'Customer', password);
    if (success) {
      resetAttempts(cleanEmail);
      setFailedAttemptsMap(prev => ({ ...prev, [cleanEmail]: 0 }));
    } else {
      const currentFailures = (failedAttemptsMap[cleanEmail] || 0) + 1;
      setFailedAttemptsMap(prev => ({ ...prev, [cleanEmail]: currentFailures }));
      
      const attemptRes = recordFailedAttempt(cleanEmail);
      if (attemptRes.locked && attemptRes.waitSeconds) {
        setLockoutSec(attemptRes.waitSeconds);
        addToast(t('auth.lockoutWarning', { sec: String(attemptRes.waitSeconds) }), 'error');
      }
    }
  };

  // Handle Forgot Password submission
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(forgotEmail || email).toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      addToast(t('checkout.email'), 'warning');
      return;
    }

    setIsSendingTempPass(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          language,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.tempPassword) {
          resetUserPassword(cleanEmail, data.tempPassword);
        }
        setFailedAttemptsMap(prev => ({ ...prev, [cleanEmail]: 0 }));
        resetAttempts(cleanEmail);
        setTempPassSentTo(cleanEmail);
        addToast(t('auth.tempPasswordSent', { email: cleanEmail }), 'success');
      } else {
        const errorMsg = data.error || 'Failed to send temporary password';
        addToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Error in forgot password request:', err);
      addToast('Failed to send temporary password. Please try again.', 'error');
    } finally {
      setIsSendingTempPass(false);
    }
  };

  // Step 1 validation: Personal info & password
  const handleRegStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast(t('checkout.fullName'), 'warning');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      addToast(t('checkout.email'), 'warning');
      return;
    }
    if (password.length < 6) {
      addToast(t('auth.pwdMin'), 'warning');
      return;
    }
    if (password !== confirmPassword) {
      addToast(t('auth.confirmPassword'), 'error');
      return;
    }
    setRegStep(2);
  };

  // Step 2 validation: Address, Country, City, Zip
  const handleRegStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!country.trim()) {
      addToast(t('auth.country'), 'warning');
      return;
    }
    if (!city.trim()) {
      addToast(t('auth.city'), 'warning');
      return;
    }
    if (!zip.trim()) {
      addToast(t('auth.zip'), 'warning');
      return;
    }
    if (!address.trim()) {
      addToast(t('auth.address'), 'warning');
      return;
    }

    // Move to step 3 and send OTP from support@dbuystore.com
    setRegStep(3);
    sendNewOtp(email);
  };

  // Step 3 validation: Verify 5-digit OTP via server
  const handleOtpVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otpDigits.join('').trim();
    
    if (enteredCode.length < 5) {
      setVerificationError(t('auth.enterCode'));
      return;
    }

    setIsVerifyingOtp(true);
    setVerificationError(null);

    try {
      const cleanEmail = sanitizeInput(email).toLowerCase();
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: enteredCode,
        }),
      });

      const data = await response.json();
      if (response.ok && data.verified) {
        // OTP Verified! Complete registration
        registerUser({
          name: sanitizeInput(name),
          email: cleanEmail,
          password,
          country: sanitizeInput(country),
          city: sanitizeInput(city),
          zip: sanitizeInput(zip),
          address: sanitizeInput(address),
          phone: sanitizeInput(phone),
        });
      } else {
        const errorMsg = data.error || t('auth.invalidOtp');
        setVerificationError(errorMsg);
        addToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      setVerificationError(t('auth.invalidOtp'));
      addToast(t('auth.invalidOtp'), 'error');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle individual OTP digit input with auto-focus next
  const handleDigitChange = (index: number, val: string) => {
    const numeric = val.replace(/\D/g, '').slice(-1); // only single digit
    const newDigits = [...otpDigits];
    newDigits[index] = numeric;
    setOtpDigits(newDigits);
    setVerificationError(null);

    if (numeric && index < 4) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Support pasting full 5-digit code from email
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    if (pasted) {
      const newDigits = ['', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      setVerificationError(null);
      const nextIdx = Math.min(pasted.length, 4);
      document.getElementById(`otp-input-${nextIdx}`)?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="absolute inset-0" onClick={() => setIsAuthModalOpen(false)} />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 p-6 sm:p-8 animate-in zoom-in-95 duration-200 my-auto">
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center mb-5 pt-1">
          <BrandLogo size="md" variant="light" styleOverride={theme.logoStyle} />
          <div className="mt-2 flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('auth.secureProtection')}</span>
          </div>
        </div>

        {/* ---------------- FORGOT PASSWORD RECOVERY VIEW ---------------- */}
        {viewMode === 'forgot' ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="text-center pb-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600 shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {t('auth.resetPasswordTitle')}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {t('auth.resetPasswordDesc')}
              </p>
            </div>

            {tempPassSentTo ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-3">
                <div className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-900">
                      {t('auth.tempPasswordSent', { email: tempPassSentTo })}
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      {language === 'ka' 
                        ? 'შეამოწმეთ ელ-ფოსტის შემოსული წერილები (Inbox / Spam) და გამოიყენეთ გამოგზავნილი დროებითი პაროლი.' 
                        : 'Check your email inbox (and spam folder) and use the received temporary password to sign in.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(tempPassSentTo);
                    setTempPassSentTo(null);
                    setViewMode('auth');
                    setTab('login');
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <span>{t('auth.backToSignIn')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingTempPass}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isSendingTempPass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('auth.sendingTempPass')}</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>{t('auth.sendTempPassword')}</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('auth');
                      setTab('login');
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('auth.backToSignIn')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className={`flex-1 py-3 text-center text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  tab === 'login'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('auth.signInTab')}
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('register')}
                className={`flex-1 py-3 text-center text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  tab === 'register'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('auth.registerTab')}
              </button>
            </div>

            {/* ---------------- LOGIN FORM ---------------- */}
            {tab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {lockoutSec > 0 && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>
                      {t('auth.lockoutWarning', { sec: String(lockoutSec) })}
                    </span>
                  </div>
                )}

                {/* 3 Failed Attempts: Offer Forgot Password */}
                {(failedAttemptsMap[email.trim().toLowerCase()] || 0) >= 3 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-start space-x-2">
                      <KeyRound className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <span className="leading-snug font-medium">{t('auth.forgotPasswordPrompt')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email.trim());
                        setViewMode('forgot');
                      }}
                      className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <span>{t('auth.forgotPassword')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('auth.password')}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email.trim());
                        setViewMode('forgot');
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={lockoutSec > 0}
                  className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer ${
                    lockoutSec > 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>{t('auth.signInTab')}</span>
                </button>
              </form>
            )}

        {/* ---------------- REGISTER MULTI-STEP ---------------- */}
        {tab === 'register' && (
          <div>
            {/* Steps Progress Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
                <span className={regStep >= 1 ? 'text-blue-600 font-extrabold' : ''}>{t('auth.step1Label')}</span>
                <span className={regStep >= 2 ? 'text-blue-600 font-extrabold' : ''}>{t('auth.step2Label')}</span>
                <span className={regStep === 3 ? 'text-blue-600 font-extrabold' : ''}>{t('auth.step3Label')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className={`h-1.5 rounded-full transition-all ${regStep >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                <div className={`h-1.5 rounded-full transition-all ${regStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                <div className={`h-1.5 rounded-full transition-all ${regStep === 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />
              </div>
            </div>

            {/* STEP 1: Profile and Password */}
            {regStep === 1 && (
              <form onSubmit={handleRegStep1Submit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('auth.fullName')}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t('auth.fullNamePlaceholder')}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('auth.password')}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={t('auth.pwdMin')}
                        className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('auth.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder={t('auth.confirmPassword')}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600">{t('auth.pwdStrength')}</span>
                      <span className="font-bold text-slate-800">{getStrengthLabel(pwdStrength.score)}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1.5">
                      <div className={`rounded-full transition-all ${pwdStrength.score >= 1 ? pwdStrength.color : 'bg-slate-200'}`} />
                      <div className={`rounded-full transition-all ${pwdStrength.score >= 2 ? pwdStrength.color : 'bg-slate-200'}`} />
                      <div className={`rounded-full transition-all ${pwdStrength.score >= 3 ? pwdStrength.color : 'bg-slate-200'}`} />
                      <div className={`rounded-full transition-all ${pwdStrength.score >= 4 ? pwdStrength.color : 'bg-slate-200'}`} />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer pt-2"
                >
                  <span>{t('auth.nextAddress')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 2: Address & Location Details (Mandatory) */}
            {regStep === 2 && (
              <form onSubmit={handleRegStep2Submit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('auth.country')}
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <select
                        required
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      >
                        {ALL_COUNTRIES.map(c => (
                          <option key={c.code} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('auth.city')}
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder={t('auth.cityPlaceholder')}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('auth.zip')}
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={zip}
                        onChange={e => setZip(e.target.value)}
                        placeholder={t('auth.zipPlaceholder')}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('auth.phone')}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder={t('auth.phonePlaceholder')}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('auth.address')}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder={t('auth.addressPlaceholder')}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="w-1/3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('auth.back')}</span>
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>{t('auth.getCode')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: 5-Digit Email Verification Code from support@dbuystore.com */}
            {regStep === 3 && (
              <form onSubmit={handleOtpVerificationSubmit} className="space-y-4">
                
                {/* Official Sender & Verification Notice */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <p className="text-xs font-black text-slate-900 leading-tight">
                            DBUY Store Official Mailer
                          </p>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <p className="text-[11px] text-blue-700 font-mono font-bold">
                          support@dbuystore.com
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {t('auth.emailSentBadge')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5">
                    <div className="flex items-start space-x-2">
                      <Inbox className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed text-slate-700">
                        {t('auth.otpDispatchedDesc')}
                      </p>
                    </div>
                    
                    <div className="pt-1 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200/60">
                      <span>{t('auth.emailTo')} <b className="text-slate-800 font-mono">{email}</b></span>
                      <span>{t('auth.senderLabel')} <b className="text-blue-700 font-mono">support@dbuystore.com</b></span>
                    </div>
                  </div>
                </div>

                {/* 5-Digit Code Entry */}
                <div>
                  <label className="block text-center text-xs font-bold text-slate-700 mb-2.5">
                    {t('auth.enterCode')}
                  </label>
                  
                  <div 
                    className="flex justify-center space-x-2.5 sm:space-x-3"
                    onPaste={handlePaste}
                  >
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleDigitChange(idx, e.target.value)}
                        onKeyDown={e => handleDigitKeyDown(idx, e)}
                        autoFocus={idx === 0}
                        placeholder="•"
                        className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-100 focus:outline-hidden transition-all shadow-2xs text-slate-900"
                      />
                    ))}
                  </div>

                  {verificationError && (
                    <p className="text-center text-xs text-red-600 font-semibold mt-2.5 flex items-center justify-center space-x-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{verificationError}</span>
                    </p>
                  )}
                </div>

                {/* Resend Action */}
                <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                  <span>{t('auth.didntReceive')}</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isSendingOtp}
                    onClick={() => sendNewOtp(email)}
                    className={`font-bold flex items-center space-x-1 transition-colors ${
                      resendCooldown > 0 || isSendingOtp
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-blue-600 hover:text-blue-700 cursor-pointer'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                    <span>
                      {isSendingOtp 
                        ? (language === 'ka' ? 'იგზავნება...' : 'Sending...')
                        : resendCooldown > 0 
                        ? t('auth.resendIn', { sec: String(resendCooldown) }) 
                        : t('auth.resend')}
                    </span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(2)}
                    className="w-1/3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('auth.addressStepBtn')}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('auth.verifying')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t('auth.completeReg')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        </>
      )}
      </div>
    </div>
  );
};

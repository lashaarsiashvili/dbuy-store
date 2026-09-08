import React, { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import { BrandLogo } from "./BrandLogo";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
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
  Loader2,
  Copy,
} from "lucide-react";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
  sanitizeInput,
  evaluatePasswordStrength,
} from "../utils/security";
import { smartApiFetch } from "../lib/api";
import { ALL_COUNTRIES } from "../data/countries";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "311692037075-dtpc8k6h5h6u01mthotlan7ba1fg1ni1.apps.googleusercontent.com";

// Sub-component that actually uses the hook
const GoogleSignInButton: React.FC<{
  onComplete: (email: string, name: string, picture?: string) => void;
}> = ({ onComplete }) => {
  const { t, language, addToast } = useStore();
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        // Fetch user info using the access token
        const res = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        );
        const data = await res.json();

        if (data.email) {
          onComplete(data.email, data.name || "Google User", data.picture);
        } else {
          throw new Error("No email found from Google");
        }
      } catch (err) {
        console.error("Failed to fetch google user info", err);
        addToast(
          language === "ka"
            ? "Google პროფილიდან მონაცემების მიღება ვერ მოხერხდა. გთხოვთ გამოიყენოთ სწრაფი რეგისტრაცია იმეილით."
            : "Failed to fetch Google profile. Please use quick email registration.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.warn("Google Login Restricted/Failed", error);
      addToast(
        language === "ka"
          ? "Google ავტორიზაცია შეზღუდულია ამ დომენზე (Origin 401). გთხოვთ გამოიყენოთ სწრაფი რეგისტრაცია იმეილით."
          : "Google sign-in is restricted on this domain (Origin 401). Please use quick email registration.",
        "warning",
      );
    },
  });

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => login()}
      className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-98 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer mt-1"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      )}
      <span>
        {language === "ka" ? "Google-ით შესვლა" : "Sign in with Google"}
      </span>
    </button>
  );
};

export const AuthModal: React.FC = () => {
  const {
    t,
    language,
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginUser,
    loginWithGoogleProfile,
    registerUser,
    resetUserPassword,
    registeredUsers,
    theme,
    isDarkMode,
    addToast,
  } = useStore();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [viewMode, setViewMode] = useState<"auth" | "forgot">("auth");

  // Registration states
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [showOptionalAddress, setShowOptionalAddress] = useState(false);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginEmailFocused, setIsLoginEmailFocused] = useState(false);
  const [isLoginPasswordFocused, setIsLoginPasswordFocused] = useState(false);
  const [isRegNameFocused, setIsRegNameFocused] = useState(false);
  const [isRegEmailFocused, setIsRegEmailFocused] = useState(false);
  const [isRegPasswordFocused, setIsRegPasswordFocused] = useState(false);
  const [isRegConfirmFocused, setIsRegConfirmFocused] = useState(false);
  const [isForgotEmailFocused, setIsForgotEmailFocused] = useState(false);
  const [authProvider, setAuthProvider] = useState<"email" | "google">("email");

  // Forgot Password / Recovery State
  const [forgotEmail, setForgotEmail] = useState("");
  const [failedAttemptsMap, setFailedAttemptsMap] = useState<
    Record<string, number>
  >({});
  const [isSendingTempPass, setIsSendingTempPass] = useState<boolean>(false);
  const [tempPassSentTo, setTempPassSentTo] = useState<string | null>(null);
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null);

  // Address Fields
  const [country, setCountry] = useState("Georgia");
  const [city, setCity] = useState("Tbilisi");
  const [zip, setZip] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Security / Lockout State
  const [lockoutSec, setLockoutSec] = useState<number>(0);

  // Password Strength
  const pwdStrength = evaluatePasswordStrength(password);

  // Password Strength Label
  const getStrengthLabel = (score: number) => {
    switch (score) {
      case 1:
        return t("auth.strength.weak");
      case 2:
        return t("auth.strength.medium");
      case 3:
        return t("auth.strength.strong");
      case 4:
        return t("auth.strength.veryStrong");
      default:
        return "";
    }
  };

  // Clean and reset all sensitive input states whenever modal opens, closes, or switches tabs
  // Real-time validation touched tracking
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const isValidEmail = (val: string): boolean => {
    const clean = val.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
  };

  // Login Form Validation Errors & States
  const loginEmailError = touched.loginEmail
    ? !email.trim()
      ? t("auth.error.emailRequired")
      : !isValidEmail(email)
      ? t("auth.error.emailInvalid")
      : null
    : null;
  const isLoginEmailValid = Boolean(touched.loginEmail && email.trim() && isValidEmail(email));

  const loginPasswordError = touched.loginPassword
    ? !password
      ? t("auth.error.passwordRequired")
      : null
    : null;
  const isLoginPasswordValid = Boolean(touched.loginPassword && password.length > 0);

  // Registration Step 1 Errors & States
  const regNameError = touched.regName
    ? !name.trim()
      ? t("auth.error.nameRequired")
      : name.trim().length < 2
      ? t("auth.error.nameMin")
      : null
    : null;
  const isRegNameValid = Boolean(touched.regName && name.trim().length >= 2);

  const regEmailError = touched.regEmail
    ? !email.trim()
      ? t("auth.error.emailRequired")
      : !isValidEmail(email)
      ? t("auth.error.emailInvalid")
      : null
    : null;
  const isRegEmailValid = Boolean(touched.regEmail && email.trim() && isValidEmail(email));

  const regPasswordError = touched.regPassword
    ? !password
      ? t("auth.error.passwordRequired")
      : password.length < 6
      ? t("auth.error.passwordMin")
      : null
    : null;
  const isRegPasswordValid = Boolean(touched.regPassword && password.length >= 6);

  const regConfirmError = touched.regConfirm
    ? !confirmPassword
      ? t("auth.error.confirmRequired")
      : confirmPassword !== password
      ? t("auth.error.passwordMismatch")
      : null
    : null;
  const isRegConfirmValid = Boolean(
    confirmPassword &&
    confirmPassword === password &&
    password.length >= 6
  );

  // Registration Step 2 Errors & States
  const regCountryError = touched.regCountry
    ? !country.trim()
      ? t("auth.error.countryRequired")
      : null
    : null;
  const isRegCountryValid = Boolean(country.trim().length > 0);

  const regCityError = touched.regCity
    ? !city.trim()
      ? t("auth.error.cityRequired")
      : null
    : null;
  const isRegCityValid = Boolean(touched.regCity && city.trim().length > 0);

  const regZipError = touched.regZip
    ? !zip.trim()
      ? t("auth.error.zipRequired")
      : null
    : null;
  const isRegZipValid = Boolean(touched.regZip && zip.trim().length > 0);

  const regPhoneError = touched.regPhone && phone.trim()
    ? phone.trim().length < 4
      ? t("auth.error.phoneInvalid")
      : null
    : null;
  const isRegPhoneValid = Boolean(touched.regPhone && phone.trim().length >= 4 && !regPhoneError);

  const regAddressError = touched.regAddress
    ? !address.trim()
      ? t("auth.error.addressRequired")
      : null
    : null;
  const isRegAddressValid = Boolean(touched.regAddress && address.trim().length > 0);

  // Forgot Password Errors & States
  const forgotEmailError = touched.forgotEmail
    ? !forgotEmail.trim()
      ? t("auth.error.emailRequired")
      : !isValidEmail(forgotEmail)
      ? t("auth.error.emailInvalid")
      : null
    : null;
  const isForgotEmailValid = Boolean(touched.forgotEmail && forgotEmail.trim() && isValidEmail(forgotEmail));

  useEffect(() => {
    if (!isAuthModalOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setIsLoginPasswordFocused(false);
      setIsRegPasswordFocused(false);
      setIsRegConfirmFocused(false);
      setCountry("Georgia");
      setCity("Tbilisi");
      setZip("");
      setAddress("");
      setPhone("");
      setRegStep(1);
      setViewMode("auth");
      setTempPassSentTo(null);
      setTouched({});
    }
  }, [isAuthModalOpen]);

  const handleRegStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegStep(2);
  };
  const handleRegStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRegisterSubmit(e);
  };

  const handleTabSwitch = (newTab: "login" | "register") => {
    setTab(newTab);
    setViewMode("auth");
    setRegStep(1);
    setPassword("");
    setConfirmPassword("");
    setIsLoginPasswordFocused(false);
    setIsRegPasswordFocused(false);
    setIsRegConfirmFocused(false);
    setTempPassSentTo(null);
    setTouched({});
  };

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSec > 0) {
      const timer = setInterval(() => {
        setLockoutSec((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSec]);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(email).toLowerCase();

    // Trigger visual validation for all login fields
    setTouched((prev) => ({ ...prev, loginEmail: true, loginPassword: true }));

    if (!cleanEmail || !isValidEmail(cleanEmail) || !password) {
      if (!cleanEmail) {
        addToast(t("auth.error.emailRequired"), "warning");
      } else if (!isValidEmail(cleanEmail)) {
        addToast(t("auth.error.emailInvalid"), "warning");
      } else if (!password) {
        addToast(t("auth.error.passwordRequired"), "warning");
      }
      return;
    }

    // Check rate limit
    const limit = checkRateLimit(cleanEmail);
    if (!limit.allowed && limit.waitSeconds) {
      setLockoutSec(limit.waitSeconds);
      addToast(
        t("auth.lockoutWarning", { sec: String(limit.waitSeconds) }),
        "error",
      );
      return;
    }

    const success = loginUser(cleanEmail, "Customer", password);
    if (success) {
      resetAttempts(cleanEmail);
      setFailedAttemptsMap((prev) => ({ ...prev, [cleanEmail]: 0 }));
      setPassword("");
      setTouched({});
    } else {
      setPassword("");
      const currentFailures = (failedAttemptsMap[cleanEmail] || 0) + 1;
      setFailedAttemptsMap((prev) => ({
        ...prev,
        [cleanEmail]: currentFailures,
      }));

      const attemptRes = recordFailedAttempt(cleanEmail);
      if (attemptRes.locked && attemptRes.waitSeconds) {
        setLockoutSec(attemptRes.waitSeconds);
        addToast(
          t("auth.lockoutWarning", { sec: String(attemptRes.waitSeconds) }),
          "error",
        );
      }
    }
  };

  // Handle Forgot Password submission
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, forgotEmail: true }));
    const cleanEmail = sanitizeInput(forgotEmail || email).toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      addToast(t("auth.error.emailInvalid"), "warning");
      return;
    }

    setIsSendingTempPass(true);
    try {
      const response = await smartApiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          language,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.tempPassword) {
          resetUserPassword(cleanEmail, data.tempPassword);
          setGeneratedTempPassword(data.tempPassword);
        }
        setFailedAttemptsMap((prev) => ({ ...prev, [cleanEmail]: 0 }));
        resetAttempts(cleanEmail);
        setTempPassSentTo(cleanEmail);
        addToast(
          language === "ka" 
            ? "🔑 დროებითი პაროლი წარმატებით გენერირებულია!" 
            : "🔑 Temporary password generated successfully!", 
          "success"
        );
      } else {
        const errorMsg = data.error || "Failed to send temporary password";
        addToast(errorMsg, "error");
      }
    } catch (err) {
      console.error("Error in forgot password request:", err);
      addToast("Failed to send temporary password. Please try again.", "error");
    } finally {
      setIsSendingTempPass(false);
    }
  };

  // Direct 1-Step Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched((prev) => ({
      ...prev,
      regName: true,
      regEmail: true,
      regPassword: true,
      regConfirm: true,
    }));

    if (!name.trim()) {
      addToast(t("auth.error.nameRequired"), "warning");
      return;
    }
    if (name.trim().length < 2) {
      addToast(t("auth.error.nameMin"), "warning");
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      addToast(t("auth.error.emailInvalid"), "warning");
      return;
    }
    if (password.length < 6) {
      addToast(t("auth.error.passwordMin"), "warning");
      return;
    }
    if (password !== confirmPassword) {
      addToast(t("auth.error.passwordMismatch"), "error");
      return;
    }

    // Validate phone only if user entered one
    if (phone.trim() && phone.trim().length < 4) {
      addToast(t("auth.error.phoneInvalid"), "warning");
      return;
    }

    setIsSubmittingReg(true);
    try {
      const cleanEmail = sanitizeInput(email).toLowerCase();

      // Check if user is already registered
      const existing = (registeredUsers || []).find(
        (u) => u.email.toLowerCase() === cleanEmail,
      );
      if (existing) {
        addToast(t("auth.emailAlreadyRegistered"), "info");
        setTab("login");
        setEmail(cleanEmail);
        setIsSubmittingReg(false);
        return;
      }

      // Complete registration directly
      registerUser({
        name: sanitizeInput(name),
        email: cleanEmail,
        password: password,
        provider: "email",
        country: sanitizeInput(country) || "Georgia",
        city: sanitizeInput(city) || "Tbilisi",
        zip: sanitizeInput(zip) || "",
        address: sanitizeInput(address) || "",
        phone: sanitizeInput(phone) || "",
      });
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleGoogleAccountSelected = (
    gEmail: string,
    gName: string,
    gPicture?: string,
  ) => {
    const cleanEmail = gEmail.trim().toLowerCase();
    loginWithGoogleProfile({
      email: cleanEmail,
      name: gName,
      picture: gPicture,
    });
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
        <div
          className="absolute inset-0"
          onClick={() => setIsAuthModalOpen(false)}
        />

        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-10 p-6 sm:p-8 animate-in zoom-in-95 duration-200 my-auto">
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Brand Header */}
          <div className="flex flex-col items-center justify-center mb-5 pt-1">
            <BrandLogo
              size="md"
              variant={isDarkMode ? 'dark' : 'light'}
              styleOverride={theme.logoStyle}
            />
            <div className="mt-2 flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t("auth.secureProtection")}</span>
            </div>
          </div>

          {/* ---------------- FORGOT PASSWORD RECOVERY VIEW ---------------- */}
          {viewMode === "forgot" ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center pb-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center mx-auto mb-3 text-blue-600 dark:text-blue-400 shadow-xs">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t("auth.resetPasswordTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {t("auth.resetPasswordDesc")}
                </p>
              </div>

              {tempPassSentTo ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs space-y-3.5 shadow-xs">
                  <div className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-950 dark:text-emerald-300 text-sm">
                        {language === "ka" ? "დროებითი პაროლი შეიქმნა!" : "Temporary Password Generated!"}
                      </p>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                        {language === "ka"
                          ? `გამომგზავნი: support@dbuystore.com • მიმღები: ${tempPassSentTo}`
                          : `Sender: support@dbuystore.com • Sent to: ${tempPassSentTo}`}
                      </p>
                    </div>
                  </div>

                  {generatedTempPassword && (
                    <div className="p-3.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                          {language === "ka" ? "თქვენი დროებითი პაროლი:" : "Your Temporary Password:"}
                        </span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 rounded-full">
                          {language === "ka" ? "აქტიურია" : "Active"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white select-all tracking-wider">
                          {generatedTempPassword}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedTempPassword);
                            addToast(
                              language === "ka" ? "პაროლი დაკოპირდა!" : "Password copied to clipboard!",
                              "info"
                            );
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{language === "ka" ? "კოპირება" : "Copy"}</span>
                        </button>
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 italic mt-1 text-center">
                        📧 {language === "ka" 
                          ? "წერილები იგზავნება support@dbuystore.com-დან. შეამოწმეთ Inbox და Spam/Junk საქაღალდე."
                          : "Dispatched from support@dbuystore.com. Please check your Inbox & Spam/Junk folder."}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (generatedTempPassword) {
                        navigator.clipboard.writeText(generatedTempPassword);
                        setPassword(generatedTempPassword);
                      }
                      setEmail(tempPassSentTo);
                      setTempPassSentTo(null);
                      setGeneratedTempPassword(null);
                      setViewMode("auth");
                      setTab("login");
                      addToast(
                        language === "ka" ? "დროებითი პაროლი ჩაისვა ფორმაში!" : "Temporary password filled into form!",
                        "success"
                      );
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{language === "ka" ? "პაროლის ჩასმა და ავტორიზაცია" : "Copy Password & Sign In"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.email")}
                    </label>
                    <div className="relative">
                      <Mail className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                        forgotEmailError
                          ? "text-red-500 dark:text-red-400"
                          : isForgotEmailValid
                          ? "text-emerald-500 dark:text-emerald-400"
                          : "text-slate-400"
                      }`} />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onMouseDown={() => setIsForgotEmailFocused(true)}
                        onClick={(e) => {
                          setIsForgotEmailFocused(true);
                          (e.target as HTMLInputElement).placeholder = "";
                          if (forgotEmail) (e.target as HTMLInputElement).select();
                        }}
                        onFocus={(e) => {
                          setIsForgotEmailFocused(true);
                          (e.target as HTMLInputElement).placeholder = "";
                          if (forgotEmail) e.target.select();
                        }}
                        onBlur={() => {
                          setIsForgotEmailFocused(false);
                          markTouched("forgotEmail");
                        }}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (touched.forgotEmail) markTouched("forgotEmail");
                        }}
                        placeholder={isForgotEmailFocused ? "" : "you@example.com"}
                        className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                          forgotEmailError
                            ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                            : isForgotEmailValid
                            ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                            : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                        }`}
                      />
                      {forgotEmailError ? (
                        <AlertCircle className="w-4 h-4 text-red-500 absolute right-3 top-3 pointer-events-none" />
                      ) : isForgotEmailValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                      ) : null}
                    </div>
                    {forgotEmailError && (
                      <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{forgotEmailError}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingTempPass}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isSendingTempPass ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t("auth.sendingTempPass")}</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>{t("auth.sendTempPassword")}</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("auth");
                        setTab("login");
                      }}
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t("auth.backToSignIn")}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* Tab Switcher */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => handleTabSwitch("login")}
                  className={`flex-1 py-3 text-center text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    tab === "login"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {t("auth.signInTab")}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSwitch("register")}
                  className={`flex-1 py-3 text-center text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    tab === "register"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {t("auth.registerTab")}
                </button>
              </div>

              {/* ---------------- LOGIN FORM ---------------- */}
              {tab === "login" && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {lockoutSec > 0 && (
                    <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>
                        {t("auth.lockoutWarning", { sec: String(lockoutSec) })}
                      </span>
                    </div>
                  )}

                  {/* 3 Failed Attempts: Offer Forgot Password */}
                  {(failedAttemptsMap[email.trim().toLowerCase()] || 0) >=
                    3 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                      <div className="flex items-start space-x-2">
                        <KeyRound className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <span className="leading-snug font-medium">
                          {t("auth.forgotPasswordPrompt")}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email.trim());
                          setViewMode("forgot");
                        }}
                        className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <span>{t("auth.forgotPassword")}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.email")}
                    </label>
                    <div className="relative">
                      <Mail className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                        loginEmailError
                          ? "text-red-500 dark:text-red-400"
                          : isLoginEmailValid
                          ? "text-emerald-500 dark:text-emerald-400"
                          : "text-slate-400"
                      }`} />
                      <input
                        type="email"
                        required
                        value={email}
                        onMouseDown={() => setIsLoginEmailFocused(true)}
                        onClick={(e) => {
                          setIsLoginEmailFocused(true);
                          (e.target as HTMLInputElement).placeholder = "";
                          if (email) (e.target as HTMLInputElement).select();
                        }}
                        onFocus={(e) => {
                          setIsLoginEmailFocused(true);
                          (e.target as HTMLInputElement).placeholder = "";
                          if (email) e.target.select();
                        }}
                        onBlur={() => {
                          setIsLoginEmailFocused(false);
                          markTouched("loginEmail");
                        }}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (touched.loginEmail) markTouched("loginEmail");
                        }}
                        placeholder={isLoginEmailFocused ? "" : "you@example.com"}
                        className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                          loginEmailError
                            ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                            : isLoginEmailValid
                            ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                            : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                        }`}
                      />
                      {loginEmailError ? (
                        <AlertCircle className="w-4 h-4 text-red-500 absolute right-3 top-3 pointer-events-none" />
                      ) : isLoginEmailValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                      ) : null}
                    </div>
                    {loginEmailError && (
                      <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{loginEmailError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("auth.password")}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email.trim());
                          setViewMode("forgot");
                        }}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer"
                      >
                        {t("auth.forgotPassword")}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                        loginPasswordError
                          ? "text-red-500 dark:text-red-400"
                          : isLoginPasswordValid
                          ? "text-emerald-500 dark:text-emerald-400"
                          : "text-slate-400"
                      }`} />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onMouseDown={() => {
                          setIsLoginPasswordFocused(true);
                          if (password === "••••••••" || password.includes("•")) {
                            setPassword("");
                          }
                        }}
                        onFocus={(e) => {
                          setIsLoginPasswordFocused(true);
                          if (password === "••••••••" || password.includes("•")) {
                            setPassword("");
                          } else if (password) {
                            e.target.select();
                          }
                        }}
                        onClick={(e) => {
                          setIsLoginPasswordFocused(true);
                          if (password === "••••••••" || password.includes("•")) {
                            setPassword("");
                          } else if (password) {
                            (e.target as HTMLInputElement).select();
                          }
                        }}
                        onBlur={() => {
                          setIsLoginPasswordFocused(false);
                          markTouched("loginPassword");
                        }}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (touched.loginPassword) markTouched("loginPassword");
                        }}
                        placeholder={isLoginPasswordFocused ? "" : t("auth.passwordPlaceholder")}
                        className={`w-full pl-9 pr-16 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                          loginPasswordError
                            ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                            : isLoginPasswordValid
                            ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                            : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                        }`}
                      />
                      <div className="absolute right-2.5 top-2.5 flex items-center space-x-1">
                        {password.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPassword("");
                              markTouched("loginPassword");
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title={language === "ka" ? "გასუფთავება" : "Clear"}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {loginPasswordError && (
                      <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{loginPasswordError}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={lockoutSec > 0}
                    className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer ${
                      lockoutSec > 0
                        ? "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>{t("auth.signInTab")}</span>
                  </button>

                  {/* Google Sign-in Divider & Button */}
                  <div className="pt-2">
                    <div className="relative flex items-center justify-center py-2">
                      <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                      <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0 uppercase tracking-wider">
                        {language === "ka"
                          ? "ან გააგრძელეთ"
                          : "or continue with"}
                      </span>
                      <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                    </div>

                    <GoogleSignInButton
                      onComplete={handleGoogleAccountSelected}
                    />
                  </div>
                </form>
              )}

              {/* ---------------- REGISTER MULTI-STEP ---------------- */}
              {tab === "register" && (
                <div>
                  {/* Steps Progress Indicator (2 Steps) */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                      <span
                        className={
                          regStep >= 1 ? "text-blue-600 dark:text-blue-400 font-extrabold" : ""
                        }
                      >
                        {t("auth.step1Label")}
                      </span>
                      <span
                        className={
                          regStep >= 2 ? "text-blue-600 dark:text-blue-400 font-extrabold" : ""
                        }
                      >
                        {t("auth.step2Label")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className={`h-1.5 rounded-full transition-all ${regStep >= 1 ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}
                      />
                      <div
                        className={`h-1.5 rounded-full transition-all ${regStep >= 2 ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}
                      />
                    </div>
                  </div>

                  {/* STEP 1: Profile and Password */}
                  {regStep === 1 && (
                    <form
                      onSubmit={handleRegStep1Submit}
                      className="space-y-3.5"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t("auth.fullName")}
                        </label>
                        <div className="relative">
                          <UserIcon className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                            regNameError
                              ? "text-red-500 dark:text-red-400"
                              : isRegNameValid
                              ? "text-emerald-500 dark:text-emerald-400"
                              : "text-slate-400"
                          }`} />
                          <input
                            type="text"
                            required
                            value={name}
                            onMouseDown={() => setIsRegNameFocused(true)}
                            onClick={(e) => {
                              setIsRegNameFocused(true);
                              (e.target as HTMLInputElement).placeholder = "";
                              if (name) (e.target as HTMLInputElement).select();
                            }}
                            onFocus={(e) => {
                              setIsRegNameFocused(true);
                              (e.target as HTMLInputElement).placeholder = "";
                              if (name) e.target.select();
                            }}
                            onBlur={() => {
                              setIsRegNameFocused(false);
                              markTouched("regName");
                            }}
                            onChange={(e) => {
                              setName(e.target.value);
                              if (touched.regName) markTouched("regName");
                            }}
                            placeholder={isRegNameFocused ? "" : t("auth.fullNamePlaceholder")}
                            className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                              regNameError
                                ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                                : isRegNameValid
                                ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                                : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                            }`}
                          />
                          {regNameError ? (
                            <AlertCircle className="w-4 h-4 text-red-500 absolute right-3 top-3 pointer-events-none" />
                          ) : isRegNameValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                          ) : null}
                        </div>
                        {regNameError && (
                          <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{regNameError}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t("auth.email")}
                        </label>
                        <div className="relative">
                          <Mail className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                            regEmailError
                              ? "text-red-500 dark:text-red-400"
                              : isRegEmailValid
                              ? "text-emerald-500 dark:text-emerald-400"
                              : "text-slate-400"
                          }`} />
                          <input
                            type="email"
                            required
                            value={email}
                            onMouseDown={() => setIsRegEmailFocused(true)}
                            onClick={(e) => {
                              setIsRegEmailFocused(true);
                              (e.target as HTMLInputElement).placeholder = "";
                              if (email) (e.target as HTMLInputElement).select();
                            }}
                            onFocus={(e) => {
                              setIsRegEmailFocused(true);
                              (e.target as HTMLInputElement).placeholder = "";
                              if (email) e.target.select();
                            }}
                            onBlur={() => {
                              setIsRegEmailFocused(false);
                              markTouched("regEmail");
                            }}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (touched.regEmail) markTouched("regEmail");
                            }}
                            placeholder={isRegEmailFocused ? "" : "you@example.com"}
                            className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                              regEmailError
                                ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                                : isRegEmailValid
                                ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                                : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                            }`}
                          />
                          {regEmailError ? (
                            <AlertCircle className="w-4 h-4 text-red-500 absolute right-3 top-3 pointer-events-none" />
                          ) : isRegEmailValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                          ) : null}
                        </div>
                        {regEmailError && (
                          <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{regEmailError}</span>
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t("auth.password")}
                          </label>
                          <div className="relative">
                            <Lock className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                              regPasswordError
                                ? "text-red-500 dark:text-red-400"
                                : isRegPasswordValid
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "text-slate-400"
                            }`} />
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              autoComplete="new-password"
                              value={password}
                              onMouseDown={() => {
                                setIsRegPasswordFocused(true);
                                if (password === "••••••••" || password.includes("•")) {
                                  setPassword("");
                                }
                              }}
                              onFocus={(e) => {
                                setIsRegPasswordFocused(true);
                                if (password === "••••••••" || password.includes("•")) {
                                  setPassword("");
                                } else if (password) {
                                  e.target.select();
                                }
                              }}
                              onClick={(e) => {
                                setIsRegPasswordFocused(true);
                                if (password === "••••••••" || password.includes("•")) {
                                  setPassword("");
                                } else if (password) {
                                  (e.target as HTMLInputElement).select();
                                }
                              }}
                              onBlur={() => {
                                setIsRegPasswordFocused(false);
                                markTouched("regPassword");
                              }}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                if (touched.regPassword) markTouched("regPassword");
                              }}
                              placeholder={isRegPasswordFocused ? "" : t("auth.pwdMin")}
                              className={`w-full pl-9 pr-14 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                                regPasswordError
                                  ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                                  : isRegPasswordValid
                                  ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                                  : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                              }`}
                            />
                            <div className="absolute right-2.5 top-2.5 flex items-center space-x-1">
                              {regPasswordError ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              ) : isRegPasswordValid ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                              >
                                {showPassword ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          {regPasswordError && (
                            <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{regPasswordError}</span>
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t("auth.confirmPassword")}
                          </label>
                          <div className="relative">
                            <Lock className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                              regConfirmError
                                ? "text-red-500 dark:text-red-400"
                                : isRegConfirmValid
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "text-slate-400"
                            }`} />
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              autoComplete="new-password"
                              value={confirmPassword}
                              onMouseDown={() => {
                                setIsRegConfirmFocused(true);
                                if (confirmPassword === "••••••••" || confirmPassword.includes("•")) {
                                  setConfirmPassword("");
                                }
                              }}
                              onFocus={(e) => {
                                setIsRegConfirmFocused(true);
                                if (confirmPassword === "••••••••" || confirmPassword.includes("•")) {
                                  setConfirmPassword("");
                                } else if (confirmPassword) {
                                  e.target.select();
                                }
                              }}
                              onClick={(e) => {
                                setIsRegConfirmFocused(true);
                                if (confirmPassword === "••••••••" || confirmPassword.includes("•")) {
                                  setConfirmPassword("");
                                } else if (confirmPassword) {
                                  (e.target as HTMLInputElement).select();
                                }
                              }}
                              onBlur={() => {
                                setIsRegConfirmFocused(false);
                                markTouched("regConfirm");
                              }}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (touched.regConfirm) markTouched("regConfirm");
                              }}
                              placeholder={isRegConfirmFocused ? "" : t("auth.confirmPassword")}
                              className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                                regConfirmError
                                  ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                                  : isRegConfirmValid
                                  ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                                  : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                              }`}
                            />
                            {regConfirmError ? (
                              <AlertCircle className="w-4 h-4 text-red-500 absolute right-3 top-3 pointer-events-none" />
                            ) : isRegConfirmValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                            ) : null}
                          </div>
                          {regConfirmError && (
                            <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{regConfirmError}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Password Strength Meter */}
                      {password && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">
                              {t("auth.pwdStrength")}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-white">
                              {getStrengthLabel(pwdStrength.score)}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 h-1.5">
                            <div
                              className={`rounded-full transition-all ${pwdStrength.score >= 1 ? pwdStrength.color : "bg-slate-200 dark:bg-slate-700"}`}
                            />
                            <div
                              className={`rounded-full transition-all ${pwdStrength.score >= 2 ? pwdStrength.color : "bg-slate-200 dark:bg-slate-700"}`}
                            />
                            <div
                              className={`rounded-full transition-all ${pwdStrength.score >= 3 ? pwdStrength.color : "bg-slate-200 dark:bg-slate-700"}`}
                            />
                            <div
                              className={`rounded-full transition-all ${pwdStrength.score >= 4 ? pwdStrength.color : "bg-slate-200 dark:bg-slate-700"}`}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer pt-2"
                      >
                        <span>{t("auth.nextAddress")}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      {/* Google Quick Register Option */}
                      <div className="pt-2">
                        <div className="relative flex items-center justify-center py-2">
                          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                          <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0 uppercase tracking-wider">
                            {language === "ka"
                              ? "ან რეგისტრაცია"
                              : "or register with"}
                          </span>
                          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                        </div>

                        <GoogleSignInButton
                          onComplete={handleGoogleAccountSelected}
                        />
                      </div>
                    </form>
                  )}

                  {/* STEP 2: Address & Location Details (Direct Registration) */}
                  {regStep === 2 && (
                    <form
                      onSubmit={handleRegStep2Submit}
                      className="space-y-3.5"
                    >
                      {authProvider === "google" && (
                        <div className="p-3 bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-2xl flex items-start space-x-2 text-xs text-blue-900 dark:text-blue-200">
                          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">
                              {language === "ka"
                                ? "Google პროფილი მიბმულია"
                                : "Google Account Verified"}{" "}
                              ({email})
                            </p>
                            <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                              {language === "ka"
                                ? "მისამართის ყველა მონაცემის შეყვანა აუცილებელია შეკვეთების მისაღებად."
                                : "All shipping address details are mandatory for order deliveries."}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t("auth.country")}
                          </label>
                          <div className="relative">
                            <Globe className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                              regCountryError
                                ? "text-red-500 dark:text-red-400"
                                : isRegCountryValid
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "text-slate-400"
                            }`} />
                            <select
                              required
                              value={country}
                              onBlur={() => markTouched("regCountry")}
                              onChange={(e) => {
                                setCountry(e.target.value);
                                if (touched.regCountry) markTouched("regCountry");
                              }}
                              className={`w-full pl-9 pr-8 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all focus:outline-hidden cursor-pointer ${
                                regCountryError
                                  ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                                  : isRegCountryValid
                                  ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                                  : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                              }`}
                            >
                              {ALL_COUNTRIES.map((c) => (
                                <option key={c.code} value={c.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            {regCountryError ? (
                              <AlertCircle className="w-4 h-4 text-red-500 absolute right-3 top-3 pointer-events-none" />
                            ) : isRegCountryValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                            ) : null}
                          </div>
                          {regCountryError && (
                            <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{regCountryError}</span>
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t("auth.city")}
                          </label>
                          <div className="relative">
                            <Building2 className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                              regCityError
                                ? "text-red-500 dark:text-red-400"
                                : isRegCityValid
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "text-slate-400"
                            }`} />
                            <input
                              type="text"
                              required
                              value={city}
                              onMouseDown={(e) => {
                                (e.target as HTMLInputElement).placeholder = "";
                              }}
                              onFocus={(e) => {
                                (e.target as HTMLInputElement).placeholder = "";
                                if (city) e.target.select();
                              }}
                              onBlur={(e) => {
                                (e.target as HTMLInputElement).placeholder = t("auth.cityPlaceholder");
                                markTouched("regCity");
                              }}
                              onChange={(e) => {
                                setCity(e.target.value);
                                if (touched.regCity) markTouched("regCity");
                              }}
                              placeholder={t("auth.cityPlaceholder")}
                              className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                                regCityError
                                  ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                                  : isRegCityValid
                                  ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                                  : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                              }`}
                            />
                            {regCityError ? (
                              <AlertCircle className="w-4 h-4 text-red-500 absolute right-3 top-3 pointer-events-none" />
                            ) : isRegCityValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                            ) : null}
                          </div>
                          {regCityError && (
                            <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{regCityError}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t("auth.zip")}
                          </label>
                          <div className="relative">
                            <KeyRound className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                              regZipError
                                ? "text-red-500 dark:text-red-400"
                                : isRegZipValid
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "text-slate-400"
                            }`} />
                            <input
                              type="text"
                              required
                              value={zip}
                              onMouseDown={(e) => {
                                (e.target as HTMLInputElement).placeholder = "";
                              }}
                              onFocus={(e) => {
                                (e.target as HTMLInputElement).placeholder = "";
                                if (zip) e.target.select();
                              }}
                              onBlur={(e) => {
                                (e.target as HTMLInputElement).placeholder = t("auth.zipPlaceholder");
                                markTouched("regZip");
                              }}
                              onChange={(e) => {
                                setZip(e.target.value);
                                if (touched.regZip) markTouched("regZip");
                              }}
                              placeholder={t("auth.zipPlaceholder")}
                              className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                                regZipError
                                  ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                                  : isRegZipValid
                                  ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                                  : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                              }`}
                            />
                            {regZipError ? (
                              <AlertCircle className="w-4 h-4 text-red-500 absolute right-3 top-3 pointer-events-none" />
                            ) : isRegZipValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                            ) : null}
                          </div>
                          {regZipError && (
                            <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{regZipError}</span>
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t("auth.phone")}
                          </label>
                          <div className="relative">
                            <Phone className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                              regPhoneError
                                ? "text-red-500 dark:text-red-400"
                                : isRegPhoneValid
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "text-slate-400"
                            }`} />
                            <input
                              type="tel"
                              value={phone}
                              onMouseDown={(e) => {
                                (e.target as HTMLInputElement).placeholder = "";
                              }}
                              onFocus={(e) => {
                                (e.target as HTMLInputElement).placeholder = "";
                                if (phone) e.target.select();
                              }}
                              onBlur={(e) => {
                                (e.target as HTMLInputElement).placeholder = t("auth.phonePlaceholder");
                                markTouched("regPhone");
                              }}
                              onChange={(e) => {
                                setPhone(e.target.value);
                                if (touched.regPhone) markTouched("regPhone");
                              }}
                              placeholder={t("auth.phonePlaceholder")}
                              className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                                regPhoneError
                                  ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                                  : isRegPhoneValid
                                  ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                                  : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                              }`}
                            />
                            {regPhoneError ? (
                              <AlertCircle className="w-4 h-4 text-red-500 absolute right-3 top-3 pointer-events-none" />
                            ) : isRegPhoneValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                            ) : null}
                          </div>
                          {regPhoneError && (
                            <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{regPhoneError}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t("auth.address")}
                        </label>
                        <div className="relative">
                          <MapPin className={`w-4 h-4 absolute left-3 top-3 transition-colors ${
                            regAddressError
                              ? "text-red-500 dark:text-red-400"
                              : isRegAddressValid
                              ? "text-emerald-500 dark:text-emerald-400"
                              : "text-slate-400"
                          }`} />
                          <input
                            type="text"
                            required
                            value={address}
                            onMouseDown={(e) => {
                              (e.target as HTMLInputElement).placeholder = "";
                            }}
                            onFocus={(e) => {
                              (e.target as HTMLInputElement).placeholder = "";
                              if (address) e.target.select();
                            }}
                            onBlur={(e) => {
                              (e.target as HTMLInputElement).placeholder = t("auth.addressPlaceholder");
                              markTouched("regAddress");
                            }}
                            onChange={(e) => {
                              setAddress(e.target.value);
                              if (touched.regAddress) markTouched("regAddress");
                            }}
                            placeholder={t("auth.addressPlaceholder")}
                            className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:transition-opacity focus:placeholder:opacity-0 focus:outline-hidden ${
                              regAddressError
                                ? "bg-red-50/50 dark:bg-red-950/25 border-2 border-red-500 dark:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500/30"
                                : isRegAddressValid
                                ? "bg-slate-50 dark:bg-slate-800 border border-emerald-500/80 dark:border-emerald-500/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                                : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                            }`}
                          />
                          {regAddressError ? (
                            <AlertCircle className="w-4 h-4 text-red-500 absolute right-3 top-3 pointer-events-none" />
                          ) : isRegAddressValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                          ) : null}
                        </div>
                        {regAddressError && (
                          <p className="flex items-center space-x-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{regAddressError}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setRegStep(1)}
                          className="w-1/3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>{t("auth.back")}</span>
                        </button>
                        <button
                          type="submit"
                          className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t("auth.completeReg")}</span>
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
    </GoogleOAuthProvider>
  );
};

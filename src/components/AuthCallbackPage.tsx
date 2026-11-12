import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import { 
  getSanitizedOrigin, 
  PRODUCTION_ORIGINS, 
  PRODUCTION_REDIRECT_URIS, 
  syncGoogleUserWithDatabase 
} from '../utils/googleAuth';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Copy, 
  ArrowRight, 
  ShieldCheck, 
  ExternalLink,
  Home,
  RefreshCw,
  Lock
} from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const { 
    language, 
    addToast, 
    setCurrentPage, 
    loginWithGoogleProfile, 
    setIsAuthModalOpen, 
    setActiveAuthTab,
    isDarkMode,
    theme 
  } = useStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'origin_mismatch' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; isNew?: boolean } | null>(null);

  const isKa = language === 'ka';
  const currentOrigin = getSanitizedOrigin();

  useEffect(() => {
    let isCancelled = false;

    async function handleAuthCallback() {
      try {
        if (typeof window === 'undefined') return;

        // Parse Hash parameters (e.g., #access_token=...&id_token=...&token_type=Bearer)
        const hash = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);

        // Parse Query parameters (e.g., ?code=...&error=origin_mismatch)
        const searchParams = new URLSearchParams(window.location.search);

        const error = searchParams.get('error') || hashParams.get('error');
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description') || '';

        // 1. Detect origin mismatch or restriction
        if (error === 'origin_mismatch' || errorDescription.toLowerCase().includes('origin_mismatch') || errorDescription.toLowerCase().includes('not a valid origin')) {
          if (!isCancelled) {
            setStatus('origin_mismatch');
            setErrorMessage(errorDescription || 'Google OAuth JavaScript Origin Mismatch');
          }
          return;
        }

        if (error) {
          if (!isCancelled) {
            setStatus('error');
            setErrorMessage(errorDescription || `Google authentication error: ${error}`);
          }
          return;
        }

        const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || searchParams.get('token');
        const idToken = hashParams.get('id_token') || searchParams.get('id_token');
        const code = searchParams.get('code');

        // 2. Access Token Flow
        if (accessToken) {
          // Fetch Google user profile
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!userinfoRes.ok) {
            throw new Error(`Failed to fetch user profile from Google (status: ${userinfoRes.status})`);
          }

          const gUser: any = await userinfoRes.json();
          if (!gUser.email) {
            throw new Error('Google did not return a valid email address.');
          }

          // Automatically sync with backend main database (users table, user_profiles, user_sessions)
          const syncResult = await syncGoogleUserWithDatabase({
            email: gUser.email,
            name: gUser.name || 'Google User',
            googleId: gUser.sub,
            picture: gUser.picture,
            idToken: idToken || undefined,
            accessToken: accessToken,
          });

          if (!isCancelled) {
            setUserProfile({
              name: gUser.name || 'Customer',
              email: gUser.email,
              isNew: syncResult.isNewUser,
            });
            setStatus('success');

            // Authenticate in Store Context
            loginWithGoogleProfile({
              email: gUser.email,
              name: gUser.name || 'Google Customer',
              picture: gUser.picture,
              googleId: gUser.sub,
              sessionToken: syncResult.sessionToken,
              user: syncResult.user,
              profile: syncResult.profile,
            });

            addToast(
              syncResult.isNewUser
                ? (isKa ? '🎉 მოგესალმებით! თქვენი ანგარიში წარმატებით შეიქმნა.' : '🎉 Welcome! Your personal account has been created.')
                : (isKa ? `მოგესალმებით, ${gUser.name || gUser.email}!` : `Welcome back, ${gUser.name || gUser.email}!`),
              'success'
            );

            // Clean up the URL hash & navigate home after brief pause
            setTimeout(() => {
              if (window.history.replaceState) {
                window.history.replaceState(null, '', '/');
              }
              setCurrentPage('home');
            }, 1800);
          }
          return;
        }

        // 3. Authorization Code Flow
        if (code) {
          const syncResult = await syncGoogleUserWithDatabase({
            email: searchParams.get('email') || '',
            name: searchParams.get('name') || 'Google Customer',
            idToken: code,
          });

          if (!isCancelled) {
            setStatus('success');
            setTimeout(() => {
              if (window.history.replaceState) {
                window.history.replaceState(null, '', '/');
              }
              setCurrentPage('home');
            }, 1800);
          }
          return;
        }

        // 4. No active token found in URL
        if (!isCancelled) {
          setStatus('error');
          setErrorMessage(isKa ? 'ავთენტიფიკაციის მონაცემები ვერ მოიძებნა' : 'No authentication tokens found in the callback URL.');
        }
      } catch (err: any) {
        console.error('[handleAuthCallback error]:', err);
        if (!isCancelled) {
          setStatus('error');
          setErrorMessage(err?.message || 'Authentication verification failed.');
        }
      }
    }

    handleAuthCallback();

    return () => {
      isCancelled = true;
    };
  }, []);

  const copyConfigDetails = () => {
    const textToCopy = `=== GOOGLE CLOUD CONSOLE OAUTH CONFIGURATION ===\n\nAuthorized JavaScript Origins (NO trailing slashes):\nhttps://www.dbuystore.com\nhttps://dbuystore.com\n${currentOrigin}\n\nAuthorized Redirect URIs:\nhttps://www.dbuystore.com/auth/callback\nhttps://dbuystore.com/auth/callback\n${currentOrigin}/auth/callback\n`;
    navigator.clipboard.writeText(textToCopy);
    addToast(isKa ? 'კონფიგურაცია დაკოპირდა!' : 'OAuth origins & URIs copied to clipboard!', 'info');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <BrandLogo size="md" variant={isDarkMode ? 'dark' : 'light'} styleOverride={theme.logoStyle} />
          <div className="mt-3 flex items-center space-x-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
            <ShieldCheck className="w-4 h-4" />
            <span>Google OAuth 2.0 Secure Authentication</span>
          </div>
        </div>

        {/* --- STATE: LOADING --- */}
        {status === 'loading' && (
          <div className="text-center py-8 space-y-4 animate-in fade-in duration-200">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <Lock className="w-6 h-6 text-blue-600 absolute" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isKa ? 'Google ავტორიზაციის ვერიფიკაცია...' : 'Verifying Google Authentication...'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {isKa 
                  ? 'ვუკავშირდებით მონაცემთა ბაზას და ვქმნით პერსონალურ უსაფრთხო სივრცეს...' 
                  : 'Validating credentials, querying main database, and preparing your isolated workspace...'}
              </p>
            </div>
          </div>
        )}

        {/* --- STATE: SUCCESS --- */}
        {status === 'success' && (
          <div className="text-center py-6 space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-md">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {userProfile?.isNew 
                  ? (isKa ? 'ანგარიში წარმატებით შეიქმნა!' : 'Account Created Successfully!')
                  : (isKa ? 'ავტორიზაცია წარმატებულია!' : 'Authentication Successful!')}
              </h3>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                {userProfile?.email}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isKa ? 'გადამისამართება მაღაზიის მთავარ გვერდზე...' : 'Redirecting to your storefront session...'}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (window.history.replaceState) window.history.replaceState(null, '', '/');
                  setCurrentPage('home');
                }}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <span>{isKa ? 'გადასვლა მაღაზიაში' : 'Continue to Store'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* --- STATE: ORIGIN MISMATCH DIAGNOSTIC --- */}
        {status === 'origin_mismatch' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-amber-950 dark:text-amber-200">
                    {isKa ? 'Google OAuth Origin Mismatch შეცდომა' : 'Google OAuth: Origin Mismatch Detected'}
                  </p>
                  <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                    {isKa
                      ? 'Google Cloud Console-ში მითითებული Authorized Origins ან Redirect URIs არ ემთხვევა მიმდინარე დომენს.'
                      : 'Google Cloud Console requires your production domains and redirect URIs without trailing slashes.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Required Settings Reference */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1 uppercase tracking-wider text-[11px]">
                  1. Authorized JavaScript Origins (Without trailing slashes):
                </span>
                <ul className="space-y-1 font-mono text-[11px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <li className="text-blue-600 dark:text-blue-400 font-bold">https://www.dbuystore.com</li>
                  <li className="text-blue-600 dark:text-blue-400 font-bold">https://dbuystore.com</li>
                  {currentOrigin !== 'https://www.dbuystore.com' && currentOrigin !== 'https://dbuystore.com' && (
                    <li className="text-slate-500">{currentOrigin} (Current)</li>
                  )}
                </ul>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1 uppercase tracking-wider text-[11px]">
                  2. Authorized Redirect URIs:
                </span>
                <ul className="space-y-1 font-mono text-[11px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <li className="text-emerald-600 dark:text-emerald-400 font-bold">https://www.dbuystore.com/auth/callback</li>
                  <li className="text-emerald-600 dark:text-emerald-400 font-bold">https://dbuystore.com/auth/callback</li>
                  {currentOrigin !== 'https://www.dbuystore.com' && currentOrigin !== 'https://dbuystore.com' && (
                    <li className="text-slate-500">{currentOrigin}/auth/callback</li>
                  )}
                </ul>
              </div>

              <button
                type="button"
                onClick={copyConfigDetails}
                className="w-full py-2.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isKa ? 'კონფიგურაციის პარამეტრების კოპირება' : 'Copy All Origins & URIs'}</span>
              </button>
            </div>

            {/* Recovery Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveAuthTab('login');
                  setIsAuthModalOpen(true);
                  setCurrentPage('home');
                }}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{isKa ? 'სწრაფი იმეილით შესვლა' : 'Quick Email Sign-In'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.history.replaceState) window.history.replaceState(null, '', '/');
                  setCurrentPage('home');
                }}
                className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Home className="w-4 h-4" />
                <span>{isKa ? 'მთავარ გვერდზე დაბრუნება' : 'Return to Home'}</span>
              </button>
            </div>
          </div>
        )}

        {/* --- STATE: GENERIC ERROR --- */}
        {status === 'error' && (
          <div className="space-y-6 text-center py-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-center justify-center mx-auto text-red-600 dark:text-red-400 shadow-md">
              <AlertCircle className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isKa ? 'ავტორიზაციის შეფერხება' : 'Authentication Interrupted'}
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-md mx-auto">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setActiveAuthTab('login');
                  setIsAuthModalOpen(true);
                  if (window.history.replaceState) window.history.replaceState(null, '', '/');
                  setCurrentPage('home');
                }}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isKa ? 'სცადეთ თავიდან / იმეილი' : 'Try Again with Email'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.history.replaceState) window.history.replaceState(null, '', '/');
                  setCurrentPage('home');
                }}
                className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                {isKa ? 'მაღაზიაში დაბრუნება' : 'Back to Store'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

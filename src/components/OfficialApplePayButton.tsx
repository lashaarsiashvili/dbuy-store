import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface OfficialApplePayButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  buttonStyle?: 'black' | 'white' | 'white-with-line';
  buttonType?: 'buy' | 'check-out' | 'pay' | 'plain';
  formatAmount?: string;
  className?: string;
  height?: number;
  locale?: string;
}

export const OfficialApplePayButton: React.FC<OfficialApplePayButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  buttonStyle = 'black',
  buttonType = 'buy',
  formatAmount,
  className = '',
  height = 52,
  locale = 'en',
}) => {
  const customElementContainerRef = useRef<HTMLDivElement | null>(null);
  const [hasCustomElement, setHasCustomElement] = useState<boolean>(false);

  // Attempt to mount Apple's Official Web Component <apple-pay-button>
  // provided by https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js
  useEffect(() => {
    let isMounted = true;

    const setupAppleCustomElement = () => {
      if (typeof window === 'undefined') return;
      const customElements = window.customElements;
      if (customElements && customElements.get('apple-pay-button')) {
        if (customElementContainerRef.current && isMounted) {
          try {
            customElementContainerRef.current.innerHTML = '';
            const appleBtn = document.createElement('apple-pay-button');
            appleBtn.setAttribute('buttonstyle', buttonStyle);
            appleBtn.setAttribute('type', buttonType);
            appleBtn.setAttribute('locale', locale);
            appleBtn.style.setProperty('--apple-pay-button-width', '100%');
            appleBtn.style.setProperty('--apple-pay-button-height', `${height}px`);
            appleBtn.style.setProperty('--apple-pay-button-border-radius', '12px');
            appleBtn.style.setProperty('--apple-pay-button-box-sizing', 'border-box');
            appleBtn.style.width = '100%';
            appleBtn.style.height = `${height}px`;
            appleBtn.style.display = 'block';
            appleBtn.style.cursor = disabled || loading ? 'not-allowed' : 'pointer';
            appleBtn.style.borderRadius = '12px';
            appleBtn.style.opacity = disabled ? '0.5' : '1';

            appleBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!disabled && !loading) {
                onClick();
              }
            });

            customElementContainerRef.current.appendChild(appleBtn);
            setHasCustomElement(true);
          } catch (e) {
            console.warn('Could not mount native apple-pay-button custom element:', e);
            setHasCustomElement(false);
          }
        }
      }
    };

    setupAppleCustomElement();
    const interval = setInterval(setupAppleCustomElement, 150);
    const timeout = setTimeout(() => clearInterval(interval), 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [buttonStyle, buttonType, locale, height, disabled, loading, onClick]);

  // Style classes according to Apple Human Interface Guidelines
  const styleClasses = {
    black: 'bg-black text-white hover:bg-neutral-900 active:bg-neutral-800 border border-black',
    white: 'bg-white text-black hover:bg-neutral-100 active:bg-neutral-200 border border-white',
    'white-with-line': 'bg-white text-black hover:bg-neutral-50 active:bg-neutral-100 border border-black/80',
  }[buttonStyle];

  const prefixText = {
    buy: 'Buy with',
    'check-out': 'Check out with',
    pay: 'Pay with',
    plain: '',
  }[buttonType];

  return (
    <div className={`relative w-full ${className}`}>
      {/* Official Apple Pay Web Component container (when registered by Apple's SDK) */}
      <div
        ref={customElementContainerRef}
        className={hasCustomElement && !loading ? 'w-full block' : 'hidden'}
        style={{ minHeight: `${height}px` }}
      />

      {/* Official Apple Pay Button Fallback & Universal Renderer */}
      {(!hasCustomElement || loading) && (
        <button
          type="button"
          id="official-apple-pay-button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled && !loading) {
              onClick();
            }
          }}
          disabled={disabled || loading}
          style={{
            minHeight: `${height}px`,
            height: `${height}px`,
            borderRadius: '12px',
            boxSizing: 'border-box',
            WebkitAppearance: 'none',
          }}
          className={`w-full relative px-6 flex items-center justify-center transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-[0.99] ${styleClasses}`}
          aria-label={`Pay with Apple Pay ${formatAmount ? `total ${formatAmount}` : ''}`}
        >
          {loading ? (
            <div className="flex items-center space-x-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-white opacity-90" />
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-white opacity-90">
                Opening Apple Pay...
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2 pointer-events-none">
              {prefixText && (
                <span
                  style={{
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
                    letterSpacing: '-0.015em',
                  }}
                  className="text-sm sm:text-base font-semibold leading-none whitespace-nowrap pr-1"
                >
                  {prefixText}
                </span>
              )}

              {/* Official Apple Pay Trademark Logo Vector from Apple Design Resources */}
              <div className="flex items-center leading-none shrink-0">
                <svg
                  viewBox="0 0 160 64"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 sm:h-7 w-auto fill-current inline-block align-middle shrink-0"
                  aria-hidden="true"
                >
                  <path d="M42.23 37.6c-.66 1.54-1.46 2.96-2.37 4.26-1.25 1.78-2.27 3.01-3.06 3.7-1.22 1.12-2.53 1.7-3.93 1.73-1.01 0-2.22-.29-3.63-.87-1.42-.58-2.72-.87-3.91-.87-1.25 0-2.59.29-4.02.87-1.43.58-2.59.89-3.47.92-1.19.04-2.5-.52-3.93-1.66-.8-.69-1.84-1.92-3.11-3.7-1.54-2.16-2.83-4.79-3.88-7.89-1.05-3.1-1.57-6.16-1.57-9.18 0-4.07 1.05-7.37 3.13-9.91 2.09-2.54 4.67-3.82 7.76-3.85 1.19 0 2.53.32 4.02.95 1.49.64 2.57.97 3.22.99.59 0 1.66-.33 3.21-.99 1.55-.67 2.83-1 3.86-.92 3.18.18 5.68 1.34 7.5 3.5-2.86 1.74-4.26 4.16-4.2 7.29.06 2.46.98 4.51 2.77 6.16 1.79 1.65 3.92 2.56 6.41 2.73-.65 2.02-1.45 4.01-2.4 5.95zM33.72 11.23c0-2.02.72-3.86 2.17-5.52 1.45-1.66 3.22-2.72 5.31-3.18.12.46.18.93.18 1.39 0 1.99-.75 3.87-2.24 5.62-1.49 1.75-3.28 2.86-5.36 3.31-.04-.55-.06-1.09-.06-1.62z" />
                  <path d="M63.53 47V25.32h7.3c2.72 0 4.8.69 6.24 2.07 1.44 1.38 2.16 3.24 2.16 5.58 0 2.37-.73 4.25-2.19 5.64-1.46 1.39-3.56 2.09-6.31 2.09h-3.41V47h-3.79zm3.79-9.59h3.63c1.55 0 2.75-.41 3.6-1.23.85-.82 1.28-1.95 1.28-3.39 0-1.41-.43-2.53-1.28-3.36-.85-.83-2.05-1.25-3.6-1.25h-3.63v9.23z" />
                  <path d="M84.34 47.33c-1.89 0-3.34-.56-4.35-1.68-1.01-1.12-1.52-2.61-1.52-4.47 0-1.93.57-3.46 1.71-4.59 1.14-1.13 2.75-1.74 4.83-1.83l4.73-.2v-.83c0-1.24-.31-2.17-.93-2.79-.62-.62-1.54-.93-2.76-.93-1.03 0-1.88.24-2.55.72-.67.48-1.09 1.13-1.26 1.95l-3.34-.43c.31-1.39 1.06-2.52 2.25-3.39 1.19-.87 2.82-1.31 4.89-1.31 2.35 0 4.14.61 5.37 1.83 1.23 1.22 1.85 2.97 1.85 5.25V47h-3.51v-2.22c-.62.77-1.42 1.39-2.4 1.86-.98.46-2.03.69-3.16.69zm.87-2.92c1.24 0 2.31-.35 3.21-1.05.9-.7 1.4-1.62 1.5-2.76l-4.14.2c-1.19.06-2.07.38-2.64.96-.57.58-.86 1.35-.86 2.31 0 .76.26 1.34.78 1.74.52.4 1.24.6 2.15.6z" />
                  <path d="M99.5 53.69l3.59-12.72-6.52-15.65h3.96l4.47 11.66 4.41-11.66h3.93L102.77 53.69H99.5z" />
                </svg>
              </div>
            </div>
          )}
        </button>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ApplePayLogo } from './PaymentLogos';

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
                <ApplePayLogo className="h-6 sm:h-7 w-auto fill-current inline-block align-middle shrink-0" />
              </div>
            </div>
          )}
        </button>
      )}
    </div>
  );
};

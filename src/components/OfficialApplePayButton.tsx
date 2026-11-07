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
            <div className="flex items-center justify-center gap-1.5 pointer-events-none">
              {prefixText && (
                <span
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
                  }}
                  className="text-[16px] font-medium tracking-normal leading-none text-white"
                >
                  {prefixText}
                </span>
              )}
              <svg
                className="h-[19px] w-auto fill-white -mt-[2px] ml-0.5"
                viewBox="0 0 384 512"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </svg>
              <span
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
                }}
                className="text-[19px] font-semibold tracking-tight leading-none text-white -ml-0.5"
              >
                Pay
              </span>
            </div>
          )}
        </button>
      )}
    </div>
  );
};

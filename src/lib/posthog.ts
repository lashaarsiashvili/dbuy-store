import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_API_KEY || 'phc_xBZDpwYNkS5gaEPe5EAT3wcBSyeSryw9wYY3qnEsMErJ';

export const initPostHog = () => {
  if (typeof window !== 'undefined' && POSTHOG_KEY && POSTHOG_KEY !== 'phc_YOUR_PROJECT_API_KEY') {
    posthog.init(POSTHOG_KEY, {
      api_host: 'https://us.i.posthog.com',
      loaded: (posthog) => {
        if (import.meta.env.DEV) posthog.debug();
      }
    });
  }
};

export const safeCapture = (event: string, properties?: Record<string, any>) => {
  if (POSTHOG_KEY && POSTHOG_KEY !== 'phc_YOUR_PROJECT_API_KEY') {
    posthog.capture(event, properties);
  }
};

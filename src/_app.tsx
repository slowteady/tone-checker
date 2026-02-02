import { AppsInToss } from '@apps-in-toss/framework';
import { PropsWithChildren } from 'react';
import { InitialProps } from '@granite-js/react-native';
import { context } from '../require.context';
import { TDSProvider } from '@toss/tds-react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { ErrorResult } from 'components/ErrorResult';
import { useDeviceInit } from 'hooks/useDeviceInit';

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,
  enableNative: false,
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  replaysSessionSampleRate: 0.3,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 3, // 3분
      staleTime: 1000 * 60 * 3, // 3분
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchIntervalInBackground: false,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  useDeviceInit();

  return (
    <QueryClientProvider client={queryClient}>
      <TDSProvider>
        <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorResult onRetry={resetError} />}>
          {children}
        </Sentry.ErrorBoundary>
      </TDSProvider>
    </QueryClientProvider>
  );
}

export default AppsInToss.registerApp(AppContainer, { context });

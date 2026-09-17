import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { useEffect, useState } from 'react';
import { LogBox, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

import '@/i18n';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { usePreferencesStore } from '@/store/preferences.store';

// MediaPipe writes this informational startup line to stderr; it is not an app error.
// Keep every other warning/error visible in development.
LogBox.ignoreLogs(['INFO: Created TensorFlow Lite XNNPACK delegate for CPU.']);
if (typeof window !== 'undefined') {
  const webConsole = console as Console & { __biovisionOriginalError?: Console['error'] };
  if (!webConsole.__biovisionOriginalError) {
    webConsole.__biovisionOriginalError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      const message = args.map(String).join(' ');
      if (message.includes('INFO: Created TensorFlow Lite XNNPACK delegate for CPU.')) return;
      webConsole.__biovisionOriginalError?.(...args);
    };
  }
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  if (__DEV__) console.error(error);
  return (
    <Screen scroll={false}>
      <ErrorState
        title={t('errors.title')}
        body={t('errors.body')}
        action={t('common.retry')}
        onAction={retry}
      />
    </Screen>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
          mutations: { retry: false },
        },
      }),
  );
  const { i18n } = useTranslation();
  const language = usePreferencesStore((state) => state.language);

  useEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [i18n, language]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });

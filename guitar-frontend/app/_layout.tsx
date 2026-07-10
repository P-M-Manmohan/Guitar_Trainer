import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAuthToken, subscribeToAuth } from '@/src/services/auth';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    getAuthToken().then((token) => setAuthenticated(Boolean(token)));
    return subscribeToAuth((token) => setAuthenticated(Boolean(token)));
  }, []);

  if (authenticated === null) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chords/[id]" options={{ title: 'Chord' }} />
          <Stack.Screen name="chords/index" options={{ title: 'Chord Library' }} />
          <Stack.Screen name="lesson/[id]" options={{ title: 'Lesson' }} />
          <Stack.Screen name="practice-session" options={{ headerShown: false }} />
          <Stack.Screen name="practice-history" options={{ title: 'Practice History' }} />
          <Stack.Screen name="recording/[id]" options={{ title: 'Recording' }} />
          <Stack.Screen name="tuner" options={{ title: 'Tuner' }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

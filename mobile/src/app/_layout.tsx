import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { expenseService } from '../services/expenseService';
import { incomeService } from '../services/incomeService';
import { budgetService } from '../services/budgetService';
import { useExpenseStore } from '../store/useExpenseStore';
import { useAppTheme } from '../hooks/use-theme';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { initAuth, user, profile, isInitialized } = useAuthStore();
  const { setExpenses, setIncomes, setBudgets } = useExpenseStore();
  const { isDark, colors } = useAppTheme();

  useEffect(() => {
    const unsubAuth = initAuth();
    return () => {
      unsubAuth();
    };
  }, []);

  // Real-time Firestore subscriptions for logged-in user
  useEffect(() => {
    if (!isInitialized) return;
    const userId = user?.uid || profile.uid || 'demo-user';
    useExpenseStore.getState().setActiveUser(userId);

    const unsubExpenses = expenseService.subscribeUserExpenses(userId, (data) => {
      setExpenses(data, userId);
    });
    const unsubIncomes = incomeService.subscribeUserIncomes(userId, (data) => {
      setIncomes(data, userId);
    });
    const unsubBudgets = budgetService.subscribeUserBudgets(userId, (data) => {
      setBudgets(data, userId);
    });

    return () => {
      unsubExpenses();
      unsubIncomes();
      unsubBudgets();
    };
  }, [isInitialized, user?.uid, profile.uid]);

  if (!isInitialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal/scan"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modal/voice"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modal/add-expense"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modal/add-income"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modal/ai-chat"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(auth)/login"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="(auth)/register"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D0F15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


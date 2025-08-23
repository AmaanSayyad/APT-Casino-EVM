"use client";

import * as React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletStatusProvider } from '@/hooks/useWalletStatus';
import { NotificationProvider } from '@/components/NotificationSystem';
import { ThemeProvider } from 'next-themes';
import { WagmiConfig, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';
import { injected, metaMask } from '@wagmi/connectors';
import { createStorage } from 'wagmi';


const queryClient = new QueryClient();

export default function Providers({ children }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Wagmi configuration with MetaMask and persistence
  const config = createConfig({
    autoConnect: true, // Auto-connect to previously connected wallet
    chains: [sepolia],
    connectors: [
      metaMask({
        dappMetadata: {
          name: 'APT Casino',
          url: 'http://localhost:3000',
        },
        shimDisconnect: true,
        UNSTABLE_shimOnConnectSelectAccount: true,
        shimChainChangedDisconnect: false,
        shimAccountChangedDisconnect: false,
      }),
      injected({
        shimDisconnect: true,
        UNSTABLE_shimOnConnectSelectAccount: true,
        shimChainChangedDisconnect: false,
        shimAccountChangedDisconnect: false,
      }),
    ],
    publicClient: createPublicClient({
      chain: sepolia,
      transport: http()
    }),
    storage: createStorage({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      key: 'aptcasino.wallet',
    }),
    ssr: true,
    pollingInterval: 10000, // Poll every 10 seconds instead of default
  });

  return (
    <Provider store={store}>
      <WagmiConfig config={config}>
        <QueryClientProvider client={queryClient}>
          <NotificationProvider>
            <WalletStatusProvider>
              <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                {children}
              </ThemeProvider>
            </WalletStatusProvider>
          </NotificationProvider>
        </QueryClientProvider>
      </WagmiConfig>
    </Provider>
  );
}

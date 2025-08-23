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
import { injected } from '@wagmi/connectors';


const queryClient = new QueryClient();

export default function Providers({ children }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Wagmi configuration with MetaMask
  const config = createConfig({
    chains: [sepolia],
    connectors: [
      injected({
        chains: [sepolia],
        options: {
          shimDisconnect: true,
          UNSTABLE_shimOnConnectSelectAccount: true,
        },
      }),
    ],
    publicClient: createPublicClient({
      chain: sepolia,
      transport: http()
    }),
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

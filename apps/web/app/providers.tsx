"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={client}>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

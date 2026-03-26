"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import SiteModals from "@/components/site/site-modals";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider refetchOnWindowFocus>
      <QueryClientProvider client={queryClient}>
        {children}
        <SiteModals />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#fdf8f4",
              color: "#4a3f3f",
              border: "1px solid #f0d4d4",
            },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}

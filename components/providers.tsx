"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { Suspense, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import superjson from "superjson";
import { FaceSelectionProvider } from "@/components/face-selection-context";
import { SelectionBar } from "@/components/selection-bar";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <FaceSelectionProvider>
          {children}
          <Suspense fallback={null}>
            <SelectionBar />
          </Suspense>
        </FaceSelectionProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

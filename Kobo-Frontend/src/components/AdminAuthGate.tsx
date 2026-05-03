"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readAuthToken } from "@/lib/api";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!readAuthToken()) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Checking session…
      </div>
    );
  }

  return children;
}

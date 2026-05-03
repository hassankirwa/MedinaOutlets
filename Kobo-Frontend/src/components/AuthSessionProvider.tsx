"use client";

import { useEffect } from "react";
import { meRequest } from "@/lib/api";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      return;
    }
    void meRequest()
      .then((user) => {
        localStorage.setItem("userProfile", JSON.stringify(user));
        localStorage.setItem("userRole", user.role?.slug ?? "");
        window.dispatchEvent(new Event("kobo-profile"));
      })
      .catch(() => {
        /* 401 handled in apiFetch */
      });
  }, []);

  return children;
}

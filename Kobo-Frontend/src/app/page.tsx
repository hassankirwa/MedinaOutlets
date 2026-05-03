"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  isFieldCollectorRole,
  loginRequest,
} from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { token, user } = await loginRequest(email.trim(), password);

      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", token);
        localStorage.setItem("userProfile", JSON.stringify(user));
        localStorage.setItem("userRole", user.role?.slug ?? "");
        window.dispatchEvent(new Event("kobo-profile"));
      }

      if (isFieldCollectorRole(user.role?.slug)) {
        router.push("/mobile/home");
        return;
      }

      router.push("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4"
      style={{
        backgroundImage: "url(/pharmaceutical-bg.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500 text-lg font-bold text-white">
            OC
          </div>
          <h1 className="text-2xl font-bold text-white">OUTLET CENSUS</h1>
          <p className="text-sm text-emerald-200">Track. Collect. Map. Empower.</p>
        </div>

        <Card className="bg-white/95 p-8 shadow-2xl backdrop-blur">
          <h2 className="mb-2 text-2xl font-bold text-foreground">Welcome Back!</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <Link href="#" className="font-medium text-emerald-600 hover:text-emerald-700">
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-10 w-full bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-muted-foreground">Or continue as</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEmail("demo@outlet.com");
              setPassword("password123");
            }}
            className="w-full"
          >
            Load Demo Credentials
          </Button>
        </Card>

        <p className="mt-6 text-center text-xs text-emerald-200">
          Copyright 2026 Outlet Census. All rights reserved.
        </p>
      </div>
    </div>
  );
}

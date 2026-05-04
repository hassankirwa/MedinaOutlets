"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { resetPasswordRequest } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const rawToken = params.token;
  const token =
    typeof rawToken === "string"
      ? rawToken
      : Array.isArray(rawToken)
        ? rawToken[0] ?? ""
        : "";
  const presetEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid reset link.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { message } = await resetPasswordRequest({
        token,
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccess(message);
      setPassword("");
      setPasswordConfirmation("");
      window.setTimeout(() => router.push("/"), 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white/95 p-8 shadow-2xl backdrop-blur">
      <h2 className="mb-2 text-2xl font-bold text-foreground">Choose a new password</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter the email from the reset message and pick a secure password (minimum 8 characters).
      </p>

      {!token ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          This reset link is missing a token. Request a new link from the login page.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {success} Redirecting to sign in…
            </p>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              New password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password_confirmation" className="block text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <Input
              id="password_confirmation"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || Boolean(success)}
            className="h-10 w-full bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700"
          >
            {isLoading ? "Saving…" : "Update password"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/" className="font-medium text-emerald-600 hover:text-emerald-700">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}

export default function ResetPasswordPage() {
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
        </div>

        <Suspense
          fallback={
            <Card className="bg-white/95 p-8 text-center text-sm text-muted-foreground backdrop-blur">
              Loading reset form…
            </Card>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

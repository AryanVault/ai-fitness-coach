"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNextPath } from "@/lib/auth/navigation";
import { signIn, useSession } from "@/lib/auth/client";
import { createDemoSession, getDemoSession } from "@/lib/dummy-auth";
import { isDemoModeEnabled } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand/BrandMark";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: sessionData, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const demoModeEnabled = isDemoModeEnabled();

  useEffect(() => {
    if (!isPending && sessionData?.user?.id) {
      router.replace(safeNextPath(searchParams.get("next")));
      return;
    }
    if (!isPending && !sessionData?.user?.id && demoModeEnabled && getDemoSession()) {
      router.replace(safeNextPath(searchParams.get("next")));
    }
  }, [demoModeEnabled, isPending, router, searchParams, sessionData?.user?.id]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if ((result as any)?.error) {
        setError((result as any).error.message || "Unable to sign in");
        return;
      }

      router.push(safeNextPath(searchParams.get("next")));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: safeNextPath(searchParams.get("next")),
      });

      if ((result as any)?.error) {
        setError((result as any).error.message || "Google sign-in is not configured yet");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in is not configured yet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="performance-shell flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
      <Card className="w-full max-w-md border-border bg-card/90 text-card-foreground">
        <CardHeader className="space-y-4">
          <Link href="/" aria-label="FitCoach home" className="studio-brand mx-auto"><BrandMark />FitCoach</Link>
          <div className="text-center">
            <CardTitle className="text-2xl font-black uppercase">Sign in to FitCoach AI</CardTitle>
            <CardDescription>{demoModeEnabled ? "Use your account or jump into demo mode to test the dashboard and live coach." : "Use your account to access the dashboard and live coach."}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form aria-busy={submitting} className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>
          <Button type="button" variant="outline" className="w-full" disabled={submitting} onClick={handleGoogleSignIn}>
            Continue with Google
          </Button>
          {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
            <Link href="/sign-in">
              <Button type="button" variant="outline" className="mt-3 w-full">
                Continue with Clerk
              </Button>
            </Link>
          ) : null}
          {demoModeEnabled ? (
            <>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  createDemoSession();
                  router.push(safeNextPath(searchParams.get("next")));
                  router.refresh();
                }}
              >
                Continue as Demo User
              </Button>
            </>
          ) : null}
          <p className="mt-4 text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:text-primary/80">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Loading your account…</p>}>
      <LoginPageInner />
    </Suspense>
  );
}

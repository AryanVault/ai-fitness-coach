"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth/client";
import { createDemoSession } from "@/lib/dummy-auth";
import { isDemoModeEnabled } from "@/lib/env";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const demoModeEnabled = isDemoModeEnabled();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await signUp.email({
        name,
        email,
        password,
      });

      if ((result as any)?.error) {
        setError((result as any).error.message || "Unable to create account");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: "/onboarding",
      });

      if ((result as any)?.error) {
        setError((result as any).error.message || "Google sign-up is not configured yet");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-up is not configured yet");
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
            <CardTitle className="text-2xl font-black uppercase">Create your FitCoach AI account</CardTitle>
            <CardDescription>{demoModeEnabled ? "Start with a real account or use demo mode to test the app without creating one." : "Start with a real account to use the production app."}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form aria-busy={submitting} className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>
          <Button type="button" variant="outline" className="w-full" disabled={submitting} onClick={handleGoogleSignUp}>
            Continue with Google
          </Button>
          {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
            <Link href="/sign-up">
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
                  router.push("/dashboard");
                  router.refresh();
                }}
              >
                Continue as Demo User
              </Button>
            </>
          ) : null}
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

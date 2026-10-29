import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { safeNextPath } from "@/lib/auth/navigation";
import { BrandMark } from "@/components/brand/BrandMark";

export const metadata = { title: "Sign in" };

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
    "/dashboard",
  );
  const alternate = `/sign-up?next=${encodeURIComponent(next)}`;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="studio-brand" aria-label="FitCoach home">
        <BrandMark />
        FitCoach
      </Link>
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <SignIn signUpUrl={alternate} forceRedirectUrl={next} />
      ) : (
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-2xl">Welcome back.</h1>
          <p className="text-sm text-muted-foreground">
            Continue to your account.
          </p>
          <Link
            className="studio-action"
            href={`/login?next=${encodeURIComponent(next)}`}
          >
            Continue
          </Link>
        </div>
      )}
    </div>
  );
}

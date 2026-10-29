import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { safeNextPath } from "@/lib/auth/navigation";
import { BrandMark } from "@/components/brand/BrandMark";

export const metadata = { title: "Create an account" };

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
    "/onboarding",
  );
  const alternate = `/sign-in?next=${encodeURIComponent(next)}`;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="studio-brand" aria-label="FitCoach home">
        <BrandMark />
        FitCoach
      </Link>
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <SignUp signInUrl={alternate} forceRedirectUrl={next} />
      ) : (
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-2xl">Start your practice.</h1>
          <p className="text-sm text-muted-foreground">
            Create an account to save your practice and progress.
          </p>
          <Link
            className="studio-action"
            href={`/signup?next=${encodeURIComponent(next)}`}
          >
            Continue
          </Link>
        </div>
      )}
    </div>
  );
}

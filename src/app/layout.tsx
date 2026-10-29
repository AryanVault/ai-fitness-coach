import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import ErrorReporter from "@/components/ErrorReporter";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "sonner";

const sporting = localFont({
  src: [
    { path: "../../public/fonts/Sporting_Grotesque-Regular_web.woff2", weight: "400" },
    { path: "../../public/fonts/Sporting_Grotesque-Bold_web.woff2", weight: "700" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "FitCoach - Move with intent", template: "%s | FitCoach" },
  description: "Build your fitness practice with camera-based movement cues, workout plans, a starter dance course, nutrition and recovery check-ins.",
  keywords: ["fitness", "AI coach", "workout", "dance", "nutrition", "personal trainer"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${sporting.variable} font-sans antialiased`}>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <AuthProvider>
          <ErrorReporter />
          <AppLayout>{children}</AppLayout>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

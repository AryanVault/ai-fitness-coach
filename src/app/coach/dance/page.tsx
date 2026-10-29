"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const DanceStudio = dynamic(() => import("@/components/dance/DanceStudio"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading AI Pose Analyzer...</p>
      </div>
    </div>
  ),
});

export default function DanceCoachPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <DanceStudio />
    </Suspense>
  );
}

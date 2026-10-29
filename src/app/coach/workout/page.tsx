"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with MediaPipe
const PoseAnalyzer = dynamic(() => import("@/components/PoseAnalyzer"), {
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

export default function WorkoutCoachPage() {
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
      <PoseAnalyzer mode="workout" />
    </Suspense>
  );
}

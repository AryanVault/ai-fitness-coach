"use client";
import { Button } from "@/components/ui/button";
export function SessionSaveStatus({ count, error, retry }: { count: number; error: string | null; retry: () => Promise<void> }) {
  if (!count && !error) return null;
  return <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-4 text-sm text-foreground"><span>{error || `${count} session${count === 1 ? "" : "s"} waiting to save on this device.`}</span><Button variant="outline" onClick={() => void retry()}>Retry saving</Button></div>;
}

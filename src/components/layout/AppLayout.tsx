"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  BatteryCharging,
  Calendar,
  ClipboardCheck,
  Dumbbell,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TrendingUp,
  Trophy,
  User,
  Users,
  Utensils,
} from "lucide-react";
import { isDemoUser } from "@/lib/dummy-auth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mainNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/review-lab", label: "Session journal", icon: ClipboardCheck },
  { href: "/workouts", label: "Movement library", icon: Dumbbell },
  { href: "/workout-plans", label: "Training plans", icon: Calendar },
  { href: "/nutrition", label: "Food & nutrition", icon: Utensils },
  { href: "/progress", label: "Your progress", icon: TrendingUp },
  { href: "/recovery", label: "Recovery", icon: BatteryCharging },
  { href: "/achievements", label: "Milestones", icon: Trophy },
  { href: "/profiles", label: "Profiles", icon: Users },
];
const coachNavItems = [
  { href: "/coach/workout", label: "Workout coach", icon: Activity },
  { href: "/coach/dance", label: "Dance studio", icon: Music2 },
  { href: "/coach/chat", label: "Ask your coach", icon: MessageSquare },
];
const publicRoutes = new Set([
  "/",
  "/login",
  "/signup",
  "/demo",
  "/review-lab/methodology",
]);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, session, loading } = useUserProfile();
  const demoMode = Boolean(session?.user?.id && isDemoUser(session.user.id));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
    } catch {
      /* Storage is optional in private browsing. */
    }
  }, []);

  const isPublicRoute =
    publicRoutes.has(pathname) ||
    ["/sign-in", "/sign-up", "/sign-out"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  const navTitle = useMemo(
    () =>
      [...mainNavItems, ...coachNavItems].find((item) => pathname === item.href)
        ?.label ??
      (pathname.startsWith("/review-lab/") ? "Session journal" : "FitCoach"),
    [pathname],
  );

  const closeNavigation = () => {
    setMobileOpen(false);
  };
  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem("sidebar-collapsed", String(next));
    } catch {
      /* The current session still works. */
    }
  };
  const setAppearance = async (theme: "light" | "dark" | "system") => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!response.ok) throw new Error("Could not save appearance");
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" ||
          (theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches),
      );
      toast.success("Appearance updated");
    } catch {
      toast.error("Appearance could not be saved. Please retry.");
    }
  };
  const handleLogout = () => {
    closeNavigation();
    window.dispatchEvent(new Event("fitcoach:stop-camera"));
    router.push("/sign-out");
  };

  if (isPublicRoute)
    return pathname === "/" ? (
      <>{children}</>
    ) : (
      <main
        id="main-content"
        className="performance-shell workspace min-h-screen bg-background"
      >
        {children}
      </main>
    );
  if (pathname === "/onboarding")
    return (
      <main id="main-content" className="workspace min-h-screen bg-background">
        {children}
      </main>
    );

  const navLinks = (items: typeof mainNavItems, compact = false) =>
    items.map(({ href, label, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        onClick={closeNavigation}
        className="app-nav-link"
        aria-current={
          pathname === href ||
          (href === "/review-lab" && pathname.startsWith("/review-lab/"))
            ? "page"
            : undefined
        }
        aria-label={compact ? label : undefined}
        title={compact ? label : undefined}
      >
        <Icon aria-hidden="true" />
        {!compact && <span>{label}</span>}
      </Link>
    ));
  const sidebar = (compact = false) => (
    <div className={cn("flex h-full flex-col", compact && "app-nav-compact")}>
      <Link
        href="/dashboard"
        onClick={closeNavigation}
        className={cn("app-brand", compact && "justify-center px-2")}
        aria-label="FitCoach dashboard"
      >
        <BrandMark />
        {!compact && "FitCoach"}
      </Link>
      <ScrollArea className="flex-1 px-3">
        <nav aria-label="Your practice">
          {navLinks(mainNavItems, compact)}
          {!compact && <p className="app-nav-group">In the studio</p>}
          {compact && <div className="h-5" />}
          {navLinks(coachNavItems, compact)}
        </nav>
      </ScrollArea>
      {demoMode && !compact && (
        <p className="app-demo-note">Demo session · sample data</p>
      )}
      <div className="p-3">
        <Link
          href="/settings"
          onClick={closeNavigation}
          className="app-nav-link"
          aria-current={pathname === "/settings" ? "page" : undefined}
          aria-label={compact ? "Settings" : undefined}
          title={compact ? "Settings" : undefined}
        >
          <Settings aria-hidden="true" />
          {!compact && "Settings"}
        </Link>
      </div>
    </div>
  );

  const name = profile?.name ?? session?.user?.name ?? "Your account";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const account = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open account menu">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-foreground text-xs">
              {loading ? "…" : initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p>{name}</p>
          <p className="mt-1 text-xs font-normal text-muted-foreground">
            {demoMode ? "Demo session" : "Your practice, your pace"}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <User aria-hidden="true" />
            Account & settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        {(["light", "dark", "system"] as const).map((theme) => (
          <DropdownMenuItem
            key={theme}
            onSelect={() => void setAppearance(theme)}
          >
            {theme === "system"
              ? "Use device setting"
              : `${theme[0].toUpperCase()}${theme.slice(1)} studio`}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="performance-shell workspace min-h-screen bg-background">
      <aside
        aria-label="Sidebar"
        className={cn(
          "app-sidebar fixed inset-y-0 left-0 z-40 hidden lg:block",
          sidebarCollapsed ? "w-[76px]" : "w-60",
        )}
      >
        {sidebar(sidebarCollapsed)}
      </aside>
      <div className={cn(sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-60")}>
        <header className="app-header sticky top-0 z-30 flex min-h-20 items-center gap-4 px-4 py-3 md:px-8">
          <div className="lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="app-sidebar w-64 p-0">
                <SheetTitle className="sr-only">FitCoach navigation</SheetTitle>
                {sidebar()}
              </SheetContent>
            </Sheet>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={
              sidebarCollapsed ? "Expand navigation" : "Collapse navigation"
            }
            aria-expanded={!sidebarCollapsed}
            className="hidden lg:inline-flex"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen aria-hidden="true" />
            ) : (
              <PanelLeftClose aria-hidden="true" />
            )}
          </Button>
          <div className="min-w-0">
            <p className="app-header-title">{navTitle}</p>
            <p className="app-header-context hidden sm:block">
              {profile?.goals?.length
                ? `Your focus: ${profile.goals[0].replace(/_/g, " ")}`
                : "A little practice. A little progress."}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground md:block">
              {demoMode
                ? "Sample data"
                : profile?.name
                  ? `Hello, ${profile.name.split(" ")[0]}`
                  : "Welcome to your practice"}
            </span>
            {account}
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-[calc(100svh-5rem)] outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

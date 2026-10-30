import { Avatar } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { formatWhen, shortName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  Bell,
  BookHeart,
  CalendarCheck,
  Compass,
  Loader2,
  LogOut,
  Plus,
  Shield,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";

const primaryNav = [
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/circles", label: "Circles", icon: Users },
  { to: "/plans", label: "My Plans", icon: CalendarCheck },
  { to: "/life", label: "My Life", icon: BookHeart },
];

function Brand() {
  return (
    <Link to="/discover" className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="relative inline-flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary"
      >
        <span className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-[60%] rounded-full bg-[oklch(0.94_0.1_90)]" />
        <span className="absolute bottom-2 left-1/2 h-px w-5 -translate-x-1/2 bg-white/70" />
      </span>
      <span className="font-display text-xl tracking-tight">saanjh</span>
    </Link>
  );
}

function Notifications() {
  const plans = useQuery(api.activities.myPlans);
  const connections = useQuery(api.reconnect.myConnections);

  const pendingHosting = (plans?.hosting ?? []).filter(
    (row) => row.pendingCount > 0,
  );
  const soon = (plans?.upcoming ?? []).filter(
    (row) =>
      row.activity.startsAt > Date.now() &&
      row.activity.startsAt < Date.now() + 48 * 3600_000,
  );
  const recentConnections = (connections ?? []).filter(
    (row) => row.createdAt > Date.now() - 7 * 86_400_000,
  );
  const total =
    pendingHosting.reduce((sum, row) => sum + row.pendingCount, 0) +
    soon.length +
    recentConnections.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label="Your updates"
        >
          <Bell className="size-4" />
          {total > 0 ? (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Needs your attention</p>
          <p className="text-xs text-muted-foreground">
            No streaks, no nudges to open the app.
          </p>
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {pendingHosting.map((row) => (
            <Link
              key={row.activity._id}
              to={`/activity/${row.activity._id}`}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"
            >
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-sm">
                <span className="font-medium">{row.pendingCount} join request{row.pendingCount === 1 ? "" : "s"}</span>
                <span className="block text-xs text-muted-foreground">
                  {row.activity.title}
                </span>
              </span>
            </Link>
          ))}
          {soon.map((row) => (
            <Link
              key={row.activity._id}
              to={`/activity/${row.activity._id}`}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"
            >
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[oklch(0.6_0.1_150)]" />
              <span className="text-sm">
                <span className="font-medium">Coming up</span>
                <span className="block text-xs text-muted-foreground">
                  {row.activity.title} · {formatWhen(row.activity.startsAt)}
                </span>
              </span>
            </Link>
          ))}
          {recentConnections.map((row) => (
            <Link
              key={row._id}
              to="/connections"
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"
            >
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[oklch(0.65_0.1_85)]" />
              <span className="text-sm">
                <span className="font-medium">New connection</span>
                <span className="block text-xs text-muted-foreground">
                  You and {shortName(row.person.displayName)} both said yes
                </span>
              </span>
            </Link>
          ))}
          {total === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nothing needs your attention. Go live your life.
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell() {
  const me = useQuery(api.profiles.me);
  const moderation = useQuery(api.moderation.status);
  const { signOut } = useAuth();
  const location = useLocation();

  if (me === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (me === null || !me.profile || !me.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  const profile = me.profile;

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-[oklch(0.958_0.02_82)] px-4 py-6 lg:flex">
        <div className="px-2">
          <Brand />
        </div>

        <Link
          to="/create"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" /> Create
        </Link>

        <nav className="mt-7 space-y-1">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 border-t border-border pt-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            You
          </p>
          <nav className="space-y-1">
            <NavLink
              to="/connections"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Users className="size-4" /> Connections
            </NavLink>
            <NavLink
              to="/safety"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Shield className="size-4" /> Safety centre
            </NavLink>
            {moderation?.isModerator ? (
              <NavLink
                to="/moderation"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <SlidersHorizontal className="size-4" /> Moderation
                {moderation.openReports > 0 ? (
                  <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {moderation.openReports}
                  </span>
                ) : null}
              </NavLink>
            ) : null}
          </nav>
        </div>

        <div className="mt-auto rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Avatar name={profile.displayName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {shortName(profile.displayName)}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile.area}, {profile.city}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 text-xs"
              asChild
            >
              <Link to="/onboarding?edit=1">Edit profile</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Sign out"
              onClick={async () => {
                await signOut();
                window.location.href = "/";
              }}
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
          <Brand />
          <div className="ml-auto flex items-center gap-1">
            <Notifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Your account" className="rounded-full">
                  <Avatar name={profile.displayName} size="sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block text-sm">{shortName(profile.displayName)}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {profile.area}, {profile.city}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/onboarding?edit=1">
                    <SlidersHorizontal className="size-4" /> Edit profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/connections">
                    <Users className="size-4" /> Connections
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/safety">
                    <Shield className="size-4" /> Safety centre
                  </Link>
                </DropdownMenuItem>
                {moderation?.isModerator ? (
                  <DropdownMenuItem asChild>
                    <Link to="/moderation">
                      <SlidersHorizontal className="size-4" /> Moderation
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    window.location.href = "/";
                  }}
                >
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="hidden items-center justify-end gap-2 px-6 pt-5 lg:flex">
          <span className="mr-auto text-xs text-muted-foreground">
            {profile.city} · plans are public-venue first
          </span>
          <Notifications />
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-14 lg:pt-2">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-2 pt-1.5">
          {primaryNav.slice(0, 2).map((item) => (
            <MobileTab key={item.to} {...item} />
          ))}
          <Link
            to="/create"
            className="mx-auto -mb-0.5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            aria-label="Create a plan"
          >
            <Plus className="size-5" />
          </Link>
          {primaryNav.slice(2).map((item) => (
            <MobileTab key={item.to} {...item} />
          ))}
        </div>
      </nav>
      <span className="sr-only" aria-live="polite">
        {location.pathname}
      </span>
    </div>
  );
}

function MobileTab({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof Compass;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
          isActive ? "text-primary" : "text-muted-foreground",
        )
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  );
}

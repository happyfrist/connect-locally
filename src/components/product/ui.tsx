import { Badge } from "@/components/ui/badge";
import { CATEGORY_MAP } from "@/convex/lib/catalog";
import { cn } from "@/lib/utils";
import { initials, shortName } from "@/lib/format";
import type { ReactNode } from "react";

const TINTS = [
  "bg-[oklch(0.92_0.04_80)] text-[oklch(0.36_0.06_55)]",
  "bg-[oklch(0.92_0.035_150)] text-[oklch(0.33_0.05_150)]",
  "bg-[oklch(0.93_0.04_30)] text-[oklch(0.4_0.08_30)]",
  "bg-[oklch(0.93_0.035_240)] text-[oklch(0.36_0.05_240)]",
  "bg-[oklch(0.94_0.045_100)] text-[oklch(0.38_0.06_90)]",
];

function tintFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * 17) % 997;
  return TINTS[hash % TINTS.length];
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "size-8 text-[11px]",
    md: "size-10 text-xs",
    lg: "size-14 text-base",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide ring-1 ring-black/5",
        sizes[size],
        tintFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-dashed border-[oklch(0.62_0.08_80)] bg-[oklch(0.96_0.035_85)] text-[10px] font-medium uppercase tracking-wider text-[oklch(0.42_0.06_75)]",
        className,
      )}
    >
      Demo profile
    </Badge>
  );
}

export function CategoryChip({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const meta = CATEGORY_MAP[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden>{meta?.emoji ?? "✦"}</span>
      {meta?.label ?? category}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 font-display text-2xl text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PersonLine({
  person,
  subtitle,
  right,
}: {
  person: { displayName: string; isDemo?: boolean };
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={person.displayName} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {shortName(person.displayName)}
          {person.isDemo ? (
            <span className="ml-2 rounded bg-[oklch(0.94_0.04_85)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.06_75)]">
              demo
            </span>
          ) : null}
        </p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="ml-auto shrink-0">{right}</div> : null}
    </div>
  );
}

export function Meter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(6, Math.min(100, value))}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground">
        {value}% shared ground
      </span>
    </div>
  );
}

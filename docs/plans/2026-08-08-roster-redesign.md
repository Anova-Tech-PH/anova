# Roster Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full visual redesign of the Evenstry web app and marketing site to the "Roster" design system — high-contrast blue/ink palette, Bricolage Grotesque + Public Sans typography, top-bar navigation, 3-pane event workspace, standalone door mode, and cmdk command palette. No data model migrations.

**Architecture:** Replace the current pale-teal Material-ish theme with a dark-ink/blue token system across both `apps/web` and `apps/website`. Remove the sidebar, add a 52px top bar with org switcher and `⌘K` command palette. Collapse the 12-tab event layout into a 3-pane workspace. Add door mode as a standalone full-bleed dark route. Rebuild the marketing site and public event page to the spec.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, CVA, cmdk, lucide-react, motion/react, Supabase

**Design spec:** `/Users/bertwinromero/Downloads/design_handoff_evenstry_roster/README.md`

---

## Task 1: Install cmdk dependency

**Files:**
- Modify: `apps/web/package.json`
- Modify: `packages/ui/package.json`

**Step 1: Install cmdk in packages/ui**

```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly
pnpm add cmdk@^1 --filter @attendly/ui
```

**Step 2: Install cmdk in apps/web (peer)**

```bash
pnpm add cmdk@^1 --filter @attendly/web
```

**Step 3: Install Bricolage Grotesque + Public Sans fonts**

These are Google Fonts loaded via `next/font/google` — no npm install needed. Just verify they resolve:

```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly
pnpm dev --filter @attendly/web &
sleep 5 && kill %1
```

Expected: dev server starts without errors.

**Step 4: Commit**

```bash
git add apps/web/package.json packages/ui/package.json pnpm-lock.yaml
git commit -m "chore: add cmdk dependency for command palette"
```

---

## Task 2: Design tokens and fonts — apps/web

Replace the color system, font loading, and CSS custom properties.

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`

**Step 1: Replace font loading in layout.tsx**

Replace `DM_Sans` and `Source_Serif_4` with `Bricolage_Grotesque` and `Public_Sans`.

In `apps/web/src/app/layout.tsx`, replace the full file with:

```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Evenstry",
  description: "Modern event management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${publicSans.variable} font-sans antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          gap={8}
          toastOptions={{
            className: "!bg-card !text-card-foreground !border-border !shadow-lg !rounded-[10px]",
            style: {
              padding: "14px 16px",
            },
          }}
        />
      </body>
    </html>
  );
}
```

**Step 2: Replace globals.css with Roster tokens**

Replace the full `apps/web/src/app/globals.css` with:

```css
@import "tailwindcss";
@import "tw-animate-css";
@source "../../../../packages/ui/src/**/*.{ts,tsx}";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-ink: var(--ink);
  --font-sans: var(--font-public-sans);
  --font-display: var(--font-bricolage);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted-strong: var(--muted-strong);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent-ink: var(--accent-ink);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-border-subtle: var(--border-subtle);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-success-bg: var(--success-bg);
  --color-success-solid: var(--success-solid);
  --color-warning: var(--warning);
  --color-warning-bg: var(--warning-bg);
  --color-warning-dark: var(--warning-dark);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 14px;
  --radius-full: 999px;
}

:root {
  --ink: oklch(0.20 0.03 250);
  --background: oklch(0.975 0.006 250);
  --foreground: oklch(0.20 0.03 250);
  --card: #ffffff;
  --card-foreground: oklch(0.20 0.03 250);
  --popover: #ffffff;
  --popover-foreground: oklch(0.20 0.03 250);
  --primary: oklch(0.50 0.16 255);
  --primary-foreground: #ffffff;
  --secondary: oklch(0.96 0.006 250);
  --secondary-foreground: oklch(0.20 0.03 250);
  --muted: oklch(0.955 0.006 250);
  --muted-foreground: oklch(0.50 0.02 250);
  --muted-strong: oklch(0.42 0.02 250);
  --accent: oklch(0.86 0.11 200);
  --accent-foreground: oklch(0.20 0.03 250);
  --accent-ink: oklch(0.50 0.16 200);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.88 0.012 250);
  --border-subtle: oklch(0.94 0.008 250);
  --input: oklch(0.88 0.012 250);
  --ring: oklch(0.50 0.16 255);
  --success: oklch(0.42 0.13 150);
  --success-bg: oklch(0.93 0.05 150);
  --success-solid: oklch(0.55 0.14 150);
  --warning: oklch(0.52 0.13 65);
  --warning-bg: oklch(0.95 0.05 75);
  --warning-dark: oklch(0.65 0.14 65);
  --chart-1: oklch(0.50 0.16 255);
  --chart-2: oklch(0.50 0.16 200);
  --chart-3: oklch(0.55 0.14 150);
  --chart-4: oklch(0.52 0.13 65);
  --chart-5: oklch(0.86 0.11 200);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-medium;
  }
}

/* Focus ring — 1.5px primary border + 3px primary/0.12 ring */
@layer base {
  :focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px oklch(0.50 0.16 255), 0 0 0 4.5px oklch(0.50 0.16 255 / 0.12);
    border-radius: 6px;
  }
}

/* Tabular nums for all numbers */
@layer base {
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}

/* Custom scrollbar */
@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: oklch(0.85 0.01 250) transparent;
  }
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: oklch(0.85 0.01 250);
    border-radius: 100px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: oklch(0.75 0.02 250);
  }
  .scrollbar-none {
    scrollbar-width: none;
  }
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
}

/* Text selection */
::selection {
  background: oklch(0.50 0.16 255 / 0.15);
  color: oklch(0.2 0.03 250);
}

/* Smooth scroll */
@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }
}
```

**Step 3: Verify the app compiles**

```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly
pnpm build --filter @attendly/web 2>&1 | tail -20
```

Expected: Build succeeds (may have page-level type errors but CSS/font should resolve).

**Step 4: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "feat(tokens): replace color system and fonts with Roster design tokens"
```

---

## Task 3: Design tokens and fonts — apps/website

**Files:**
- Modify: `apps/website/src/app/layout.tsx`
- Modify: `apps/website/src/app/globals.css`

**Step 1: Replace font loading in layout.tsx**

Replace `apps/website/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Evenstry — Run the whole event from a single screen",
  description:
    "Publish the page, take the registrations, mark who walked in. One workspace per event.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${bricolage.variable} ${publicSans.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Replace globals.css**

Replace `apps/website/src/app/globals.css` with:

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-public-sans);
  --font-display: var(--font-bricolage);
  --color-ink: oklch(0.20 0.03 250);
  --color-background: oklch(0.975 0.006 250);
  --color-primary: oklch(0.50 0.16 255);
  --color-primary-foreground: #ffffff;
  --color-accent: oklch(0.86 0.11 200);
  --color-accent-ink: oklch(0.50 0.16 200);
  --color-border: oklch(0.88 0.012 250);
  --color-muted-foreground: oklch(0.50 0.02 250);
  --color-muted-strong: oklch(0.42 0.02 250);
  --color-success: oklch(0.42 0.13 150);
  --color-card: #ffffff;
}

@layer base {
  body {
    @apply bg-background text-ink font-medium relative overflow-x-hidden;
  }
}

::selection {
  background: oklch(0.50 0.16 255 / 0.15);
}

@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }
}
```

**Step 3: Commit**

```bash
git add apps/website/src/app/layout.tsx apps/website/src/app/globals.css
git commit -m "feat(tokens): update website app to Roster design tokens and fonts"
```

---

## Task 4: Update packages/ui primitives

Update Button, Badge, Card, Input, Avatar, and Logo to use Roster radii, weights, and colors.

**Files:**
- Modify: `packages/ui/src/components/ui/button.tsx`
- Modify: `packages/ui/src/components/ui/badge.tsx`
- Modify: `packages/ui/src/components/ui/card.tsx`
- Modify: `packages/ui/src/components/ui/input.tsx`
- Modify: `packages/ui/src/components/ui/avatar.tsx`
- Modify: `packages/ui/src/components/logo.tsx`

**Step 1: Update Button**

Replace `packages/ui/src/components/ui/button.tsx`:

```tsx
import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[6px] text-[15px] font-bold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/12 focus-visible:border-primary active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:brightness-92 shadow-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-primary/5 hover:text-foreground",
        destructive: "bg-destructive text-white hover:brightness-92 shadow-sm",
        outline: "border-[1.5px] border-border bg-card hover:bg-primary/5 hover:border-primary/30",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4 text-[14px]",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

**Step 2: Update Badge**

Replace `packages/ui/src/components/ui/badge.tsx`:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        destructive: "bg-destructive/10 text-destructive",
        info: "bg-accent/20 text-accent-ink",
        outline: "border border-border text-muted-foreground",
        live: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
```

**Step 3: Update Card**

Replace `packages/ui/src/components/ui/card.tsx`:

```tsx
import { forwardRef } from "react";
import { cn } from "../../utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[10px] border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-150",
        hoverable && "hover:shadow-[0_4px_12px_rgba(0,0,0,0.07)] hover:border-primary/15",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-display text-[19px] font-extrabold tracking-[-0.025em]", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-strong", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

**Step 4: Update Input**

Replace `packages/ui/src/components/ui/input.tsx`:

```tsx
import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "w-full rounded-[6px] border-[1.5px] border-border bg-card px-3 py-[13px] text-[15px] font-semibold transition-all duration-150 outline-none placeholder:text-muted-foreground/50 placeholder:font-medium hover:border-ring/40 focus:border-primary focus:ring-[3px] focus:ring-primary/12",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "w-full rounded-[6px] border-[1.5px] border-border bg-card px-3 py-[13px] text-[15px] font-semibold transition-all duration-150 outline-none placeholder:text-muted-foreground/50 placeholder:font-medium hover:border-ring/40 focus:border-primary focus:ring-[3px] focus:ring-primary/12",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
```

**Step 5: Update Avatar**

Replace `packages/ui/src/components/ui/avatar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { cn } from "../../utils/cn";

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const avatarColors = [
  "bg-[oklch(0.93_0.03_255)] text-[oklch(0.42_0.14_255)]",
  "bg-success-bg text-success",
  "bg-[oklch(0.93_0.04_200)] text-accent-ink",
  "bg-warning-bg text-warning",
  "bg-destructive/10 text-destructive",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}

export function Avatar({ src, name, size = "md", className, ring }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = sizes[size];
  const colorClass = name ? avatarColors[hashName(name) % avatarColors.length] : avatarColors[0];
  const ringClass = ring ? "ring-2 ring-background shadow-sm" : "";

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        onError={() => setImgError(true)}
        className={cn("shrink-0 rounded-[6px] object-cover", sizeClass, ringClass, className)}
      />
    );
  }

  if (name) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[6px] font-bold",
          sizeClass,
          colorClass,
          ringClass,
          className
        )}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[6px] bg-muted text-muted-foreground",
        sizeClass,
        ringClass,
        className
      )}
    >
      <User className="h-1/2 w-1/2" />
    </div>
  );
}
```

**Step 6: Update Logo to wordmark**

Replace `packages/ui/src/components/logo.tsx`:

```tsx
import { cn } from "../utils/cn";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "color" | "white";
  className?: string;
}

const fontSizes = {
  xs: "text-[14px]",
  sm: "text-[16px]",
  md: "text-[19px]",
  lg: "text-[22px]",
  xl: "text-[28px]",
};

export function Logo({ size = "md", variant = "color", className }: LogoProps) {
  const textColor = variant === "white" ? "text-white" : "text-ink";

  return (
    <span
      className={cn(
        "font-display font-extrabold uppercase tracking-[-0.03em]",
        fontSizes[size],
        textColor,
        className
      )}
    >
      EVENSTRY
    </span>
  );
}
```

**Step 7: Commit**

```bash
git add packages/ui/src/
git commit -m "feat(ui): update all primitives to Roster design system"
```

---

## Task 5: Top bar and command palette

Replace the sidebar layout with a 52px ink top bar. Add the ⌘K command palette.

**Files:**
- Create: `packages/ui/src/components/ui/command-palette.tsx`
- Modify: `packages/ui/src/components/ui/index.ts`
- Modify: `packages/ui/package.json` (exports)
- Modify: `apps/web/src/app/(organizer)/layout.tsx`

**Step 1: Create CommandPalette component**

Create `packages/ui/src/components/ui/command-palette.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { cn } from "../../utils/cn";

export interface CommandItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
  group?: string;
}

interface CommandPaletteProps {
  items: CommandItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ items, open, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!isOpen);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  const groups = new Map<string, CommandItem[]>();
  for (const item of items) {
    const group = item.group ?? "Actions";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(item);
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative mx-auto mt-[20vh] w-full max-w-[520px] px-4">
        <Command
          className="rounded-[12px] border border-border bg-card shadow-[0_16px_48px_rgba(0,0,0,0.2)] overflow-hidden"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <Command.Input
            placeholder="Type a command or search..."
            className="w-full border-b border-border-subtle bg-transparent px-4 py-3.5 text-[15px] font-medium outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <Command.List className="max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            {Array.from(groups.entries()).map(([group, groupItems]) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {groupItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    onSelect={() => {
                      item.onSelect();
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-[7px] px-3 py-2.5 text-[14px] font-semibold text-foreground transition-colors aria-selected:bg-primary/5 aria-selected:text-primary"
                  >
                    {item.icon && (
                      <span className="flex h-5 w-5 items-center justify-center text-muted-foreground">
                        {item.icon}
                      </span>
                    )}
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <kbd className="ml-auto text-[11px] font-mono text-muted-foreground">
                        {item.shortcut}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
```

**Step 2: Export CommandPalette from index.ts**

Add to `packages/ui/src/components/ui/index.ts`:

```ts
export { CommandPalette, type CommandItem } from "./command-palette";
```

**Step 3: Replace organizer layout with top bar**

Replace `apps/web/src/app/(organizer)/layout.tsx` with the new top-bar layout:

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Plus,
  Calendar,
  Ticket,
  ListChecks,
  Tag,
  Mail,
  ClipboardList,
  Settings,
  BarChart3,
  ScanLine,
  Users,
} from "lucide-react";
import { PageTransition, CommandPalette, type CommandItem } from "@attendly/ui/components";
import { Logo } from "@attendly/ui/logo";
import { Avatar } from "@attendly/ui/components";
import { Button } from "@attendly/ui/components";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);

  const commandItems: CommandItem[] = [
    { id: "new-event", label: "Create new event", icon: <Plus className="h-4 w-4" />, group: "Actions", onSelect: () => router.push("/events/new") },
    { id: "dashboard", label: "Go to dashboard", icon: <BarChart3 className="h-4 w-4" />, group: "Navigate", onSelect: () => router.push("/dashboard") },
    { id: "events", label: "View all events", icon: <Calendar className="h-4 w-4" />, group: "Navigate", onSelect: () => router.push("/events") },
    { id: "team", label: "Team settings", icon: <Users className="h-4 w-4" />, group: "Navigate", onSelect: () => router.push("/settings/team") },
    { id: "settings", label: "Account settings", icon: <Settings className="h-4 w-4" />, group: "Navigate", onSelect: () => router.push("/settings") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar — 52px, ink background */}
      <header className="sticky top-0 z-40 flex h-[52px] items-center gap-4 bg-ink px-4">
        {/* Left: wordmark + org */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Logo size="sm" variant="white" />
          </Link>
          <span className="text-white/30">/</span>
          <button className="flex items-center gap-1 text-[14px] font-semibold text-white/90 hover:text-white transition-colors">
            Grace Chapel
            <ChevronDown className="h-3.5 w-3.5 text-white/50" />
          </button>
        </div>

        {/* Right: ⌘K chip, new event button, avatar */}
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-1.5 rounded-[6px] border border-white/22 px-2.5 py-1 text-[13px] font-mono text-white/70 hover:text-white/90 hover:border-white/35 transition-colors"
          >
            <span>⌘K</span>
          </button>
          <Link href="/events/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New event
            </Button>
          </Link>
          <Avatar name="User" size="xs" className="h-[30px] w-[30px] rounded-[6px]" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-7 py-7">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Command palette */}
      <CommandPalette
        items={commandItems}
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add packages/ui/src/components/ui/command-palette.tsx packages/ui/src/components/ui/index.ts apps/web/src/app/\(organizer\)/layout.tsx
git commit -m "feat: replace sidebar with ink top bar and add ⌘K command palette"
```

---

## Task 6: Marketing site

Complete rebuild of `apps/website/src/app/page.tsx` to the Roster marketing design.

**Files:**
- Modify: `apps/website/src/app/page.tsx`

**Step 1: Replace the marketing homepage**

Replace `apps/website/src/app/page.tsx` with the Roster marketing page. This is a long file — the full implementation follows the spec's 5 sections: Nav, Hero (blue), Features (3 cards), Pricing, and CTA/Footer. All `--ink` backgrounds, Bricolage headings, Public Sans body, lucide icons.

The implementation should follow the spec exactly (README.md lines 128–140). Key details:
- Nav: 66px, full-width `--ink` bar, 1300px container, wordmark + links + CTA
- Hero: full-bleed `--primary`, 2-column grid, app window preview, stat row
- Features: 3-column card grid with lucide icons
- Pricing: split panel with checklist
- CTA + Footer: `--ink` block

Due to length, the full implementation is provided as a separate file. Build it section by section, matching pixel values from the spec. Use Tailwind utility classes, not inline styles. Use `font-display` for Bricolage headings.

Import icons from `lucide-react`: `ArrowRight`, `Copy`, `ScanLine`, `BarChart3`, `Check`.

**Step 2: Verify**

```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly
pnpm build --filter @attendly/website 2>&1 | tail -10
```

**Step 3: Commit**

```bash
git add apps/website/src/app/page.tsx
git commit -m "feat: rebuild marketing site to Roster design"
```

---

## Task 7: Sign in page

Redesign the login page to the Roster spec — two equal columns, ink left panel with steps, white right panel with form.

**Files:**
- Modify: `apps/web/src/app/(auth)/login/page.tsx`

**Step 1: Replace the login page**

Preserve the existing auth logic (`supabase.auth.signInWithPassword`, `?redirect=` handling) but completely replace the JSX to match the spec:

- **Left panel:** `--ink` background, 48px padding, column flex `space-between`. Wordmark at top. Middle: H1 "One screen. Every gathering." (Bricolage 46px/800), numbered 3-step list with `--accent` numerals. Footer: "FREE WHILE IN EARLY ACCESS" (12px/700 uppercase).
- **Right panel:** White, centered 380px form. H1 "Sign in" (Bricolage 32px/800). Uppercase 12px/700 labels above inputs. Full-width blue submit. "or" divider + Google button. "New here? Create an organisation" link.

Key: Labels are `text-[12px] font-bold uppercase tracking-[0.06em]` — NOT inline-icon labels. Password row has "Forgot?" right-aligned on the label row.

Remove: remember-me checkbox, decorative floating shapes, check-list, Logo imports for old logo.

**Step 2: Commit**

```bash
git add apps/web/src/app/\(auth\)/login/page.tsx
git commit -m "feat: redesign sign-in page to Roster two-panel layout"
```

---

## Task 8: Organiser home (dashboard)

Redesign the dashboard to the Roster spec — today strip, stat strip, event tables grouped by type.

**Files:**
- Modify: `apps/web/src/app/(organizer)/dashboard/page.tsx`
- Modify or create: `apps/web/src/app/(organizer)/dashboard/dashboard-content.tsx`

**Step 1: Update the dashboard page and content**

The dashboard should show:
1. **Today strip** — full-width `--primary` panel (only when event is live today). Shows event name, session info, in-room count, "Open door mode" button.
2. **Stat strip** — 4-up bordered white grid with 1px internal dividers. Labels 12px/600, values Bricolage 30px/800 tabular-nums.
3. **Repeats every week** — section with table showing recurring events (use existing event data, group events that share a name pattern or just show all events).
4. **One-off events** — table with status badges (Live, Filling, Draft).

Since we're not adding recurrence to the data model, group events by existing fields. The "Repeats every week" section can be omitted or shown as a static label with all events in the "Events" table.

Key visual details:
- Section labels: `text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground`
- Table header: `bg-[oklch(0.955_0.006_250)]`, `text-[11px] font-bold uppercase`
- Event name: `text-[14px] font-bold`, meta: `text-[13px] text-muted-strong`
- Count: `font-display text-[14px] font-bold tabular-nums`
- Status badges use the updated Badge component

The server component (`page.tsx`) fetches stats and events, passes them to a client component for rendering.

**Step 2: Commit**

```bash
git add apps/web/src/app/\(organizer\)/dashboard/
git commit -m "feat: redesign organiser home to Roster layout with stat strip and event tables"
```

---

## Task 9: Public event page

Redesign the public event page with the Roster spec — ink hero with inline registration card.

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/page.tsx`

**Step 1: Rebuild public event page**

Key changes from current:
- **Header:** 58px, white, 1px bottom border. Org wordmark left, nav links + blue "Register" button right.
- **Hero:** `--ink` background, 1180px container, `1.3fr 1fr` grid. Left: registration-open pill, H1 event title (Bricolage 62px/800), meta row (calendar, map-pin, users icons in `--accent`), description. Right: white registration card with ticket selection and inline form (no separate `/register` route needed for the primary flow).
- **Below hero:** Programme list (ruled, not cards) with day segmented control. Speakers list with initials tiles.

The registration card is the biggest change — it moves inline instead of being a separate page. Keep the existing form submission logic but render it in-page.

**Step 2: Commit**

```bash
git add apps/web/src/app/\(public\)/
git commit -m "feat: redesign public event page with ink hero and inline registration card"
```

---

## Task 10: Door mode route

Create the standalone full-bleed dark door mode at `/door/[eventId]`.

**Files:**
- Create: `apps/web/src/app/door/[eventId]/page.tsx`
- Create: `apps/web/src/app/door/[eventId]/layout.tsx`
- Create: `apps/web/src/app/door/[eventId]/door-mode.tsx`

**Step 1: Create door layout (no app chrome)**

Create `apps/web/src/app/door/[eventId]/layout.tsx`:

```tsx
export default function DoorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-white">
      {children}
    </div>
  );
}
```

**Step 2: Create door page (server component)**

Create `apps/web/src/app/door/[eventId]/page.tsx`:

```tsx
import { createClient } from "@attendly/ui/supabase/server";
import { redirect } from "next/navigation";
import { DoorMode } from "./door-mode";

export default async function DoorPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (!event) redirect("/dashboard");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, start_time, end_time, location")
    .eq("event_id", eventId)
    .eq("enable_check_in", true)
    .order("start_time");

  return (
    <DoorMode
      eventId={eventId}
      eventTitle={event.title}
      sessions={sessions ?? []}
    />
  );
}
```

**Step 3: Create DoorMode client component**

Create `apps/web/src/app/door/[eventId]/door-mode.tsx` — a "use client" component implementing the door mode spec:

- Full-bleed `--ink`, no app chrome, column flex
- **Header:** 18px 28px padding, `--accent` eyebrow "DOOR MODE · HALL B", session title, running count (Bricolage 32px/800 tabular), outlined "Exit" button
- **Body:** grid `1.15fr 1fr`
- **Left (scanner):** Centered QR viewport with corner brackets, scan line, manual fallback input
- **Right (result):** Confirmation panel (green), last-few list, duplicate warning, volunteer footer

Reuse the existing `html5-qrcode` scanner and `checkInByQrCode` server action from `@/features/registration/`. Keep the 2-second pause-and-resume behavior.

**Step 4: Commit**

```bash
git add apps/web/src/app/door/
git commit -m "feat: add standalone door mode route with full-bleed dark UI"
```

---

## Task 11: Event workspace — 3-pane layout

The largest change. Replace the 12-tab event layout with a 3-pane workspace.

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/page.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/workspace/people-pane.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/workspace/programme-pane.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/workspace/door-pane.tsx`

**Step 1: Simplify event layout**

Replace the 12-tab layout in `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` with a simpler wrapper that just shows the event title and back button in the top bar context:

```tsx
import Link from "next/link";
import { ArrowLeft, ExternalLink, ScanLine } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import { Badge, Button } from "@attendly/ui/components";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, status, slug, organization_id, organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const isLive = event.status === "published";
  const orgSlug = (event as any).organizations?.slug;
  const publicUrl = orgSlug ? `/${orgSlug}/${event.slug}` : null;

  return (
    <div className="-mx-7 -mt-7">
      {/* Event header bar — sits inside the main content area but stretches full width */}
      <div className="flex h-[52px] items-center gap-4 border-b border-border-subtle bg-ink px-4">
        <Link href="/events" className="text-white/60 hover:text-white/90 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-[14px] font-bold text-white">{event.title}</span>
        {isLive && <Badge variant="live" className="ml-1">Live</Badge>}

        <div className="ml-auto flex items-center gap-3">
          {publicUrl && (
            <Link
              href={publicUrl}
              target="_blank"
              className="flex items-center gap-1.5 rounded-[6px] border border-white/22 px-3 py-1.5 text-[13px] font-semibold text-white/80 hover:text-white hover:border-white/35 transition-colors"
            >
              Public page
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          <Link href={`/door/${eventId}`}>
            <Button size="sm" className="gap-1.5">
              <ScanLine className="h-3.5 w-3.5" />
              Open door mode
            </Button>
          </Link>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
```

**Step 2: Build the 3-pane workspace page**

Replace `apps/web/src/app/(organizer)/events/[eventId]/page.tsx` with the workspace that renders three panes side by side on desktop and as tabs on mobile:

- **People pane (left, 300px):** Search, filter chips, attendee list with status dots
- **Programme pane (centre, fluid):** Day segmented control, session cards with left-border state
- **Door pane (right, 300px):** Scan count, last scan, volunteers, ticket progress bars

Each pane is a client component. The page server component fetches all needed data (registrations, sessions, check-in stats) and passes it down.

**Step 3: Create PeoplePane**

`apps/web/src/app/(organizer)/events/[eventId]/workspace/people-pane.tsx` — "use client" component with:
- "PEOPLE" eyebrow label + count
- Search input
- Filter chips (All, In, Awaiting, Staff) as pills
- Scrollable attendee list with initials tiles and status dots
- Selected state tints `--primary/0.06`

**Step 4: Create ProgrammePane**

`apps/web/src/app/(organizer)/events/[eventId]/workspace/programme-pane.tsx` — "use client" component with:
- "PROGRAMME" eyebrow label + day segmented control
- Session cards with 3px left border by state (past/live/upcoming/break)
- Live session has inline "Scan at this door" and "Message room" buttons
- "+ Add a session" dashed affordance

**Step 5: Create DoorPane**

`apps/web/src/app/(organizer)/events/[eventId]/workspace/door-pane.tsx` — "use client" component with:
- Centred count card with progress bar
- Last scan success card
- Volunteers list
- Ticket progress bars

**Step 6: Keep existing sub-routes accessible**

Do NOT delete the existing routes (schedule, tickets, registrations, etc.). They remain accessible by URL and via the ⌘K command palette. Just remove the tab strip from the layout.

Add event-specific commands to the command palette by creating a client wrapper that merges event-level commands into the global palette.

**Step 7: Responsive — below 1024px, panes become tabs**

In the workspace page component, detect `< lg` and render a tab bar (People / Programme / Door) instead of the 3-column grid.

**Step 8: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/
git commit -m "feat: replace 12-tab event layout with 3-pane workspace"
```

---

## Task 12: Final polish and verification

**Step 1: Update the public layout header**

Modify `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/layout.tsx` to match the Roster public header spec: 58px, white, org wordmark left, nav + Register button right.

**Step 2: Verify all pages render**

```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly
pnpm build --filter @attendly/web 2>&1 | tail -30
pnpm build --filter @attendly/website 2>&1 | tail -10
```

**Step 3: Visual spot-check with dev server**

```bash
pnpm dev --filter @attendly/web &
pnpm dev --filter @attendly/website &
```

Open in browser:
- `http://localhost:3000/login` — two-panel sign in
- `http://localhost:3000/dashboard` — top bar, stat strip, event tables
- `http://localhost:3000/events/<id>` — 3-pane workspace
- `http://localhost:3000/door/<id>` — full-bleed dark door mode
- `http://localhost:3002` — marketing site

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish Roster redesign and fix build errors"
```

---

## Summary of structural changes

| Before | After |
|--------|-------|
| 240px sidebar nav | 52px ink top bar + ⌘K |
| DM Sans + Source Serif fonts | Bricolage Grotesque + Public Sans |
| Teal primary (oklch 0.445 0.107 195) | Blue primary (oklch 0.50 0.16 255) |
| 12-tab event layout | 3-pane workspace |
| Check-in page inside event tabs | Standalone `/door/[eventId]` route |
| Separate registration page | Inline registration card on public event page |
| Montserrat + Inter on marketing | Bricolage + Public Sans on marketing |
| Rounded-xl (12px) radii | 6px buttons, 10px panels, 12px frames |
| Logo icon + serif wordmark | Plain uppercase Bricolage wordmark |

## Files NOT deleted

All existing sub-routes under `events/[eventId]/` (schedule, tickets, registrations, check-in, rooms, emails, survey, analytics, settings, custom-fields, promo-codes) are kept. They are accessible via URL and the ⌘K command palette. The tab strip is removed from the layout but the routes remain.

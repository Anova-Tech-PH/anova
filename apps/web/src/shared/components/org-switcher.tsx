"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";
import { cn } from "@attendly/ui/cn";

type Org = { id: string; name: string; slug: string };

export function OrgSwitcher({
  currentSlug,
  collapsed,
}: {
  currentSlug: string;
  collapsed: boolean;
}) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchOrgs() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organizations(id, name, slug)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!memberships) return;

      setOrgs(
        memberships.map((m) => {
          const org = m.organizations as any;
          return { id: org.id, name: org.name, slug: org.slug };
        })
      );
    }

    fetchOrgs();
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const currentOrg = orgs.find((o) => o.slug === currentSlug);

  if (collapsed) {
    return (
      <button
        onClick={() => setOpen(!open)}
        className="relative mx-auto flex h-7 w-7 items-center justify-center rounded-[3px] bg-sidebar-accent text-xs font-bold text-foreground"
        title={currentOrg?.name ?? currentSlug}
      >
        {(currentOrg?.name ?? currentSlug).charAt(0).toUpperCase()}
        {open && (
          <div ref={containerRef} className="absolute left-full top-0 z-50 ml-2 w-52">
            <DropdownMenu
              orgs={orgs}
              currentSlug={currentSlug}
              onSelect={(slug) => {
                setOpen(false);
                router.push(`/org/${slug}/dashboard`);
              }}
              onCreate={() => {
                setOpen(false);
                router.push("/onboarding?new=1");
              }}
            />
          </div>
        )}
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-sm transition-colors",
          "text-foreground hover:bg-sidebar-accent"
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] bg-sidebar-accent text-[10px] font-bold">
          {(currentOrg?.name ?? currentSlug).charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 truncate text-left text-sm font-medium">
          {currentOrg?.name ?? currentSlug}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1">
          <DropdownMenu
            orgs={orgs}
            currentSlug={currentSlug}
            onSelect={(slug) => {
              setOpen(false);
              router.push(`/org/${slug}/dashboard`);
            }}
            onCreate={() => {
              setOpen(false);
              router.push("/onboarding?new=1");
            }}
          />
        </div>
      )}
    </div>
  );
}

function DropdownMenu({
  orgs,
  currentSlug,
  onSelect,
  onCreate,
}: {
  orgs: Org[];
  currentSlug: string;
  onSelect: (slug: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-md border border-sidebar-border bg-sidebar py-1 shadow-lg">
      {orgs.map((org) => (
        <button
          key={org.id}
          onClick={() => onSelect(org.slug)}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors",
            org.slug === currentSlug
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          )}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] bg-sidebar-accent text-[9px] font-bold">
            {org.name.charAt(0).toUpperCase()}
          </span>
          <span className="flex-1 truncate text-left">{org.name}</span>
          {org.slug === currentSlug && <Check className="h-3.5 w-3.5 shrink-0 text-brand-pink" />}
        </button>
      ))}
      <div className="my-1 border-t border-sidebar-border" />
      <button
        onClick={onCreate}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Create organization</span>
      </button>
    </div>
  );
}

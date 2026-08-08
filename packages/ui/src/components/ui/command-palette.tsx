"use client";

import { useEffect, useState } from "react";
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
                    className="flex cursor-pointer items-center gap-3 rounded-[7px] px-3 py-2.5 text-[14px] font-semibold text-foreground transition-colors data-[selected=true]:bg-primary/5 data-[selected=true]:text-primary"
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

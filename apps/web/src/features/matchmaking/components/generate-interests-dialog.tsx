"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button, ModalOverlay } from "@attendly/ui/components";
import {
  generateInterests,
  createInterest,
} from "@/features/matchmaking/actions";
import { toast } from "sonner";

interface GenerateInterestsDialogProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
}

export function GenerateInterestsDialog({
  eventId,
  open,
  onClose,
}: GenerateInterestsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addProgress, setAddProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  async function doGenerate() {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setChecked({});

    try {
      const results = await generateInterests(eventId);
      setSuggestions(results);
      const initial: Record<string, boolean> = {};
      for (const s of results) {
        initial[s] = true;
      }
      setChecked(initial);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate interests"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      doGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleCheck(name: string) {
    setChecked((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  const selectedCount = Object.values(checked).filter(Boolean).length;

  async function handleAddSelected() {
    const selected = suggestions.filter((s) => checked[s]);
    if (selected.length === 0) return;

    setAdding(true);
    setAddProgress({ current: 0, total: selected.length });

    try {
      for (let i = 0; i < selected.length; i++) {
        setAddProgress({ current: i + 1, total: selected.length });
        await createInterest(eventId, { name: selected[i] });
      }
      toast.success(`Added ${selected.length} interest${selected.length > 1 ? "s" : ""}`);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add interests"
      );
    } finally {
      setAdding(false);
    }
  }

  if (!open) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 rounded-xl bg-card p-6 shadow-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Generate Interests</h3>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Generating interests...
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-destructive">
              Failed to generate interests
            </p>
            <Button variant="outline" size="sm" onClick={doGenerate}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && suggestions.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              Select the interests you want to add:
            </p>
            <div className="space-y-2">
              {suggestions.map((name) => (
                <label
                  key={name}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={!!checked[name]}
                    onChange={() => toggleCheck(name)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">{name}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {!loading && !error && suggestions.length > 0 && (
            <Button
              onClick={handleAddSelected}
              disabled={adding || selectedCount === 0}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {adding
                ? `Adding ${addProgress.current} of ${addProgress.total}...`
                : `Add Selected (${selectedCount})`}
            </Button>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

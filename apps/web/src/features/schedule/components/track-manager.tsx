"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { createTrack, updateTrack, deleteTrack } from "../actions";

const TRACK_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316",
];

type Track = {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
};

export function TrackManager({
  eventId,
  initialTracks,
  onTracksChange,
}: {
  eventId: string;
  initialTracks: Track[];
  onTracksChange: (tracks: Track[]) => void;
}) {
  const [tracks, setTracks] = useState(initialTracks);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TRACK_COLORS[0]);
  const [isPending, startTransition] = useTransition();

  function updateTracks(newTracks: Track[]) {
    setTracks(newTracks);
    onTracksChange(newTracks);
  }

  async function handleAdd() {
    if (!name.trim()) return;
    try {
      const track = await createTrack(eventId, { name: name.trim(), color });
      updateTracks([...tracks, track]);
      setAdding(false);
      setName("");
      toast.success("Track created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create track");
    }
  }

  async function handleUpdate(trackId: string) {
    if (!name.trim()) return;
    try {
      await updateTrack(eventId, trackId, { name: name.trim(), color });
      updateTracks(tracks.map((t) => (t.id === trackId ? { ...t, name: name.trim(), color } : t)));
      setEditingId(null);
      setName("");
      toast.success("Track updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update track");
    }
  }

  function handleDeleteTrack(track: Track) {
    if (!confirm(`Delete track "${track.name}"? Sessions in this track will become unassigned.`)) return;
    startTransition(async () => {
      try {
        await deleteTrack(eventId, track.id);
        updateTracks(tracks.filter((t) => t.id !== track.id));
        toast.success("Track deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete track");
      }
    });
  }

  function startEdit(track: Track) {
    setEditingId(track.id);
    setName(track.name);
    setColor(track.color ?? TRACK_COLORS[0]);
    setAdding(false);
  }

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setName("");
    setColor(TRACK_COLORS[tracks.length % TRACK_COLORS.length]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tracks</h3>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Track
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tracks.map((track) =>
          editingId === track.id ? (
            <div key={track.id} className="flex items-center gap-2 rounded-lg border bg-card p-2">
              <div className="flex gap-1">
                {TRACK_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-5 w-5 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-28 rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleUpdate(track.id)}
              />
              <button onClick={() => handleUpdate(track.id)} className="text-green-600 hover:text-green-700">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div
              key={track.id}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5"
            >
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: track.color ?? "#888" }} />
              <span className="text-sm">{track.name}</span>
              <button onClick={() => startEdit(track)} className="text-muted-foreground hover:text-foreground">
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleDeleteTrack(track)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )
        )}

        {adding && (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
            <div className="flex gap-1">
              {TRACK_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-5 w-5 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Track name"
              className="w-28 rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button onClick={handleAdd} className="text-green-600 hover:text-green-700">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setAdding(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {tracks.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">
          No tracks yet. Tracks let you organize sessions into parallel streams.
        </p>
      )}
    </div>
  );
}

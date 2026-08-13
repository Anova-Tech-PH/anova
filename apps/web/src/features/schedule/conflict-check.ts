export type SessionForConflict = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  track_id: string | null;
  speaker_ids: string[];
};

export type Conflict = {
  type: "room" | "speaker" | "track";
  sessionIds: [string, string];
  sessionTitles: [string, string];
  detail: string;
};

function overlaps(a: SessionForConflict, b: SessionForConflict): boolean {
  const aStart = new Date(a.start_time).getTime();
  const aEnd = new Date(a.end_time).getTime();
  const bStart = new Date(b.start_time).getTime();
  const bEnd = new Date(b.end_time).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export function detectConflicts(sessions: SessionForConflict[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];

      if (!overlaps(a, b)) continue;

      if (a.location && b.location && a.location === b.location) {
        conflicts.push({
          type: "room",
          sessionIds: [a.id, b.id],
          sessionTitles: [a.title, b.title],
          detail: `Both scheduled in "${a.location}"`,
        });
      }

      const sharedSpeakers = a.speaker_ids.filter((id) =>
        b.speaker_ids.includes(id)
      );
      if (sharedSpeakers.length > 0) {
        conflicts.push({
          type: "speaker",
          sessionIds: [a.id, b.id],
          sessionTitles: [a.title, b.title],
          detail: `${sharedSpeakers.length} shared speaker(s)`,
        });
      }

      if (a.track_id && b.track_id && a.track_id === b.track_id) {
        conflicts.push({
          type: "track",
          sessionIds: [a.id, b.id],
          sessionTitles: [a.title, b.title],
          detail: `Both on the same track`,
        });
      }
    }
  }

  return conflicts;
}

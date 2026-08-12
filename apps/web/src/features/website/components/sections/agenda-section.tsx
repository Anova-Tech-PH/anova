import type { Section } from "../../types";

interface Session {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  session_speakers?: Array<{
    speakers: { id: string; name: string } | null;
  }>;
}

interface AgendaSectionProps {
  section: Section;
  sessions: Session[];
  basePath: string;
}

export function AgendaSection({ section, sessions, basePath }: AgendaSectionProps) {
  const title = (section.content.title as string) || "Schedule";

  if (sessions.length === 0) return null;

  // Group sessions by date
  const grouped = new Map<string, Session[]>();
  for (const session of sessions) {
    const date = new Date(session.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(session);
  }

  return (
    <section className="px-4 py-16 bg-muted/30">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center text-2xl font-bold">{title}</h2>
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([date, daySessions]) => (
            <div key={date}>
              <h3 className="mb-4 text-lg font-semibold">{date}</h3>
              <div className="space-y-2">
                {daySessions.map((session) => {
                  const startTime = new Date(session.start_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const endTime = new Date(session.end_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const speakerNames = (session.session_speakers ?? [])
                    .map((ss) => ss.speakers?.name)
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <div
                      key={session.id}
                      className="flex items-start gap-4 rounded-lg border bg-card p-3"
                    >
                      <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">
                        {startTime} - {endTime}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{session.title}</p>
                        {speakerNames && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {speakerNames}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <a
            href={`${basePath}/schedule`}
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--website-primary)" }}
          >
            View Full Schedule
          </a>
        </div>
      </div>
    </section>
  );
}

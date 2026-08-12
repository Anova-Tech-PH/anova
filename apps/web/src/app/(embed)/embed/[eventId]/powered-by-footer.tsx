export function PoweredByFooter({ eventUrl }: { eventUrl?: string }) {
  return (
    <div className="py-4 text-center text-xs text-muted-foreground">
      Powered by{" "}
      {eventUrl ? (
        <a
          href={eventUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Attendly
        </a>
      ) : (
        <span>Attendly</span>
      )}
    </div>
  );
}

"use client";

import { ExternalLink } from "lucide-react";

function parseVideoUrl(url: string): { type: "youtube" | "vimeo" | "unknown"; id?: string } {
  // YouTube: youtube.com/watch?v=X or youtu.be/X
  const ytLong = url.match(/(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/);
  if (ytLong) return { type: "youtube", id: ytLong[1] };

  const ytShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (ytShort) return { type: "youtube", id: ytShort[1] };

  // Vimeo: vimeo.com/12345
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: "vimeo", id: vimeo[1] };

  return { type: "unknown" };
}

export function VideoEmbed({ url, title }: { url: string; title?: string }) {
  const parsed = parseVideoUrl(url);

  if (parsed.type === "youtube" && parsed.id) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={`https://www.youtube.com/embed/${parsed.id}`}
          title={title ?? "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  if (parsed.type === "vimeo" && parsed.id) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={`https://player.vimeo.com/video/${parsed.id}`}
          title={title ?? "Video"}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  // Fallback: render as link
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-primary hover:underline"
    >
      <ExternalLink className="h-4 w-4" />
      {title ?? url}
    </a>
  );
}

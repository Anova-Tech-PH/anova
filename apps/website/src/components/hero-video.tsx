"use client";

import { useRef, useEffect } from "react";

const VIDEO_SRC =
  "https://videos.pexels.com/video-files/8244250/8244250-uhd_2560_1440_25fps.mp4";
const POSTER_SRC =
  "https://images.pexels.com/videos/8244250/administration-adult-banking-business-8244250.jpeg?auto=compress&cs=tinysrgb&w=1600";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }, []);

  return (
    <figure
      className="relative m-0 border-b border-white/10 bg-surface"
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        poster={POSTER_SRC}
        muted
        loop
        playsInline
        preload="auto"
        className="block w-full object-cover [height:clamp(260px,44vw,520px)] [filter:grayscale(1)_contrast(1.1)_brightness(0.72)]"
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
      <div className="absolute inset-0 [background:linear-gradient(180deg,rgba(8,8,10,0.55),rgba(8,8,10,0.1)_45%,rgba(8,8,10,0.9))]" />
      <figcaption className="absolute left-0 right-0 bottom-0 flex justify-between gap-6 [padding:18px_clamp(20px,5vw,64px)] text-[11px] font-semibold tracking-[0.2em] uppercase text-on-surface-variant">
        <span>Registration desk, day one</span>
        <span className="tracking-[0.04em] normal-case text-muted">
          Footage: Henri Mathieu-Saint-Laurent / Pexels
        </span>
      </figcaption>
    </figure>
  );
}

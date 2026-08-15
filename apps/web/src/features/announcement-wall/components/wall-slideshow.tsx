"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Calendar, MapPin, Megaphone, Clock, BarChart2 } from "lucide-react";

import type { SlideData } from "../lib/build-slides";

type WallSlideshowProps = {
  slides: SlideData[];
  rotationSpeed: number;
  theme: "dark" | "light";
  eventTitle: string;
};

const SLIDE_ICONS: Record<SlideData["type"], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  event_overview: Calendar,
  announcement: Megaphone,
  session: Clock,
  poll: BarChart2,
  sponsor: Megaphone,
  custom: Megaphone,
};

export default function WallSlideshow({
  slides,
  rotationSpeed,
  theme,
  eventTitle,
}: WallSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const isDark = theme === "dark";

  // Auto-advance slides with fade transition
  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
        setVisible(true);
      }, 300);
    }, rotationSpeed * 1000);

    return () => clearInterval(interval);
  }, [slides.length, rotationSpeed]);

  // Reset index when slides change
  useEffect(() => {
    setCurrentIndex(0);
    setVisible(true);
  }, [slides.length]);

  const currentSlide = slides[currentIndex] as SlideData | undefined;

  // Generate QR code when slide changes
  useEffect(() => {
    if (!currentSlide?.qrUrl) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(currentSlide.qrUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: isDark ? "#ffffff" : "#000000",
        light: "#00000000",
      },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [currentIndex, currentSlide?.qrUrl, isDark]);

  // Empty state
  if (slides.length === 0) {
    return (
      <div
        className={`flex h-screen w-screen items-center justify-center ${
          isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
        }`}
      >
        <p className="text-2xl opacity-60">
          Announcement Wall is not configured yet.
        </p>
      </div>
    );
  }

  if (!currentSlide) return null;

  const Icon = SLIDE_ICONS[currentSlide.type] ?? Megaphone;

  const bgStyle = currentSlide.bgColor
    ? { backgroundColor: currentSlide.bgColor }
    : undefined;

  const baseBg = isDark ? "bg-slate-900" : "bg-white";
  const baseText = isDark ? "text-white" : "text-slate-900";

  return (
    <div
      className={`relative flex h-screen w-screen flex-col ${baseBg} ${baseText}`}
      style={bgStyle}
    >
      {/* Slide content */}
      <div
        className="flex flex-1 flex-col items-center justify-center gap-6 px-16 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {/* Type icon */}
        <Icon className="h-12 w-12 opacity-40" />

        {/* Title */}
        <h1 className="max-w-4xl text-center text-5xl font-bold leading-tight">
          {currentSlide.title}
        </h1>

        {/* Body */}
        {currentSlide.body && (
          <p className="max-w-3xl text-center text-2xl opacity-70">
            {currentSlide.body}
          </p>
        )}

        {/* Speakers */}
        {currentSlide.speakers && currentSlide.speakers.length > 0 && (
          <p className="text-xl opacity-60">
            {currentSlide.speakers.join(" \u00B7 ")}
          </p>
        )}

        {/* Meta (location, tier, etc.) */}
        {currentSlide.meta && (
          <div className="flex items-center gap-2 opacity-50">
            <MapPin className="h-5 w-5" />
            <span className="text-lg">{currentSlide.meta}</span>
          </div>
        )}

        {/* Sponsor logo */}
        {currentSlide.type === "sponsor" && currentSlide.logoUrl && (
          <img
            src={currentSlide.logoUrl}
            alt={currentSlide.title}
            className="mt-4 max-h-32 max-w-xs object-contain"
          />
        )}

        {/* QR code */}
        {qrDataUrl && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <img src={qrDataUrl} alt="QR Code" className="h-48 w-48" />
            {currentSlide.qrLabel && (
              <span className="text-sm uppercase tracking-widest opacity-50">
                {currentSlide.qrLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-8 py-4 opacity-40">
        <span className="text-sm">{eventTitle}</span>
        <span className="text-sm">
          {currentIndex + 1} / {slides.length}
        </span>
      </div>
    </div>
  );
}

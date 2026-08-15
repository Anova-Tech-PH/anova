"use client";

import { useState, useRef, useEffect } from "react";
import { Eye, ChevronDown, Globe, Smartphone, FileText } from "lucide-react";
import Link from "next/link";

type RegistrationPageItem = {
  name: string;
  slug: string;
};

export function PreviewDropdown({
  portalUrl,
  registrationPages = [],
}: {
  portalUrl: string;
  registrationPages?: RegistrationPageItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Eye className="h-3.5 w-3.5" />
        Preview
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover shadow-md">
          <div className="py-1">
            <Link
              href={portalUrl}
              target="_blank"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Globe className="h-4 w-4 text-muted-foreground" />
              Web App
            </Link>
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
              <Smartphone className="h-4 w-4" />
              Mobile App
              <span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span>
            </div>
            {registrationPages.length > 0 ? (
              registrationPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`${portalUrl}/register/${page.slug}`}
                  target="_blank"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {page.name}
                </Link>
              ))
            ) : (
              <Link
                href={`${portalUrl}/register`}
                target="_blank"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Registration Page
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

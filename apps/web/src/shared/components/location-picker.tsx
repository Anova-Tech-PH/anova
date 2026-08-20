"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ExternalLink, RotateCcw, MapPin, Search } from "lucide-react";
import { Input } from "@attendly/ui/components";

export type LocationData = {
  place_id?: string;
  formatted_address?: string;
  venue_name?: string;
  address_lines?: string[];
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  lat?: number;
  lng?: number;
};

interface LocationPickerProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  onTimezoneDetected?: (tz: string) => void;
}

export type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

export function parseNominatimResult(result: NominatimResult): LocationData {
  const addr = result.address;
  const streetNumber = addr.house_number ?? "";
  const route = addr.road ?? "";
  const line1 = [streetNumber, route].filter(Boolean).join(" ");
  const suburb = addr.suburb ?? "";
  const address_lines = [line1, suburb].filter(Boolean);
  const city = addr.city || addr.town || addr.village || "";

  return {
    place_id: String(result.place_id),
    formatted_address: result.display_name,
    address_lines,
    city,
    state: addr.state ?? "",
    zip: addr.postcode ?? "",
    country: addr.country ?? "",
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
  };
}

function AddressAutocomplete({
  onSelect,
}: {
  onSelect: (result: NominatimResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(value)}`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }

  function handleSelect(result: NominatimResult) {
    setQuery(result.display_name);
    setShowDropdown(false);
    onSelect(result);
  }

  return (
    <div ref={containerRef} className="relative z-[9999]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search for an address or place..."
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-[9999] mt-1 w-full rounded-md border bg-popover shadow-lg">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => handleSelect(result)}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{result.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;

    async function initMap() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !mapRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 15);
        mapInstanceRef.current.eachLayer((layer) => {
          if (layer instanceof L.Marker) layer.remove();
        });
      } else {
        mapInstanceRef.current = L.map(mapRef.current).setView([lat, lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapInstanceRef.current);
      }

      const icon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="oklch(0.445 0.107 195)" stroke="white" stroke-width="1.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        className: "",
      });

      L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current);
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      className="h-[250px] w-full overflow-hidden rounded-lg border"
    />
  );
}

function ManualLocationInputs({
  value,
  onChange,
}: {
  value: LocationData;
  onChange: (data: LocationData) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Venue name</label>
        <Input
          type="text"
          value={value.venue_name ?? ""}
          onChange={(e) => onChange({ ...value, venue_name: e.target.value })}
          placeholder="Convention Center"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Address</label>
        <Input
          type="text"
          value={value.formatted_address ?? ""}
          onChange={(e) => onChange({ ...value, formatted_address: e.target.value })}
          placeholder="123 Main St, City, State"
        />
      </div>
    </div>
  );
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const handleSelect = useCallback(
    (result: NominatimResult) => {
      const parsed = parseNominatimResult(result);
      onChange(parsed);
    },
    [onChange]
  );

  function handleReset() {
    onChange({});
  }

  return (
    <div className="space-y-3">
      <AddressAutocomplete onSelect={handleSelect} />

      {value.lat && value.lng ? (
        <>
          <LocationMap lat={value.lat} lng={value.lng} />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Venue name</label>
              <Input
                type="text"
                value={value.venue_name ?? ""}
                onChange={(e) => onChange({ ...value, venue_name: e.target.value })}
                placeholder="Convention Center"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            {value.address_lines?.map((line, i) => (
              <p key={i} className="text-muted-foreground">{line}</p>
            ))}
            <p className="text-muted-foreground">
              {[value.city, value.state, value.zip].filter(Boolean).join(", ")}
            </p>
            {value.country && (
              <p className="text-muted-foreground">{value.country}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`https://www.openstreetmap.org/?mlat=${value.lat}&mlon=${value.lng}#map=16/${value.lat}/${value.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Maps
            </a>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-sm text-destructive hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset location
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

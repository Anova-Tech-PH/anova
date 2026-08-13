"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { APIProvider, Map, AdvancedMarker, useMapsLibrary, useApiLoadingStatus } from "@vis.gl/react-google-maps";
import { ExternalLink, RotateCcw } from "lucide-react";
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

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

function PlacesAutocompleteInput({
  onPlaceSelect,
}: {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placesLib = useMapsLibrary("places");

  useEffect(() => {
    if (!placesLib || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      types: ["establishment", "geocode"],
      fields: ["place_id", "formatted_address", "name", "address_components", "geometry"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        onPlaceSelect(place);
      }
    });

    autocompleteRef.current = autocomplete;
  }, [placesLib, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="Type a venue name or address..."
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
}

function parseAddressComponents(components: google.maps.GeocoderAddressComponent[]): {
  city: string;
  state: string;
  zip: string;
  country: string;
  address_lines: string[];
} {
  let streetNumber = "";
  let route = "";
  let city = "";
  let state = "";
  let zip = "";
  let country = "";
  let sublocality = "";

  for (const c of components) {
    const type = c.types[0];
    if (type === "street_number") streetNumber = c.long_name;
    else if (type === "route") route = c.long_name;
    else if (type === "locality") city = c.long_name;
    else if (type === "sublocality_level_1" || type === "sublocality") sublocality = c.long_name;
    else if (type === "administrative_area_level_1") state = c.long_name;
    else if (type === "postal_code") zip = c.long_name;
    else if (type === "country") country = c.long_name;
  }

  const line1 = [streetNumber, route].filter(Boolean).join(" ");
  const address_lines = [line1, sublocality].filter(Boolean);

  return { city: city || sublocality, state, zip, country, address_lines };
}

function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="h-[250px] w-full overflow-hidden rounded-lg border">
      <Map
        defaultCenter={{ lat, lng }}
        defaultZoom={15}
        mapId="evenstry-location"
        center={{ lat, lng }}
        zoom={15}
        disableDefaultUI
        gestureHandling="cooperative"
      >
        <AdvancedMarker position={{ lat, lng }} />
      </Map>
    </div>
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

function GoogleMapsContent({
  value,
  onChange,
  onFallback,
}: {
  value: LocationData;
  onChange: (data: LocationData) => void;
  onFallback: () => void;
}) {
  const status = useApiLoadingStatus();
  const placesLib = useMapsLibrary("places");
  const hasFallen = useRef(false);

  // Detect explicit API failure
  useEffect(() => {
    if ((status === "FAILED" || status === "AUTH_FAILURE") && !hasFallen.current) {
      hasFallen.current = true;
      onFallback();
    }
  }, [status, onFallback]);

  // Detect Google Maps billing/auth error dialog injected into the DOM
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const errorContainer = document.querySelector(".gm-err-container, .dismissButton");
      if (errorContainer && !hasFallen.current) {
        hasFallen.current = true;
        // Remove Google's error overlay
        const overlay = document.querySelector(".gm-err-container");
        overlay?.closest(".gm-style")?.remove();
        // Remove the dismissable error popup
        const popup = errorContainer.closest("div");
        if (popup?.textContent?.includes("can't load Google Maps")) {
          popup.remove();
        }
        onFallback();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [onFallback]);

  const handlePlaceSelect = useCallback(
    (place: google.maps.places.PlaceResult) => {
      const parsed = parseAddressComponents(place.address_components ?? []);
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();

      onChange({
        place_id: place.place_id,
        formatted_address: place.formatted_address,
        venue_name: place.name,
        address_lines: parsed.address_lines,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
        country: parsed.country,
        lat,
        lng,
      });
    },
    [onChange]
  );

  function handleReset() {
    onChange({});
  }

  if (status === "LOADING" || !placesLib) {
    return (
      <input
        type="text"
        disabled
        placeholder="Loading Google Maps..."
        className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
      />
    );
  }

  return (
    <div className="space-y-3">
      <PlacesAutocompleteInput onPlaceSelect={handlePlaceSelect} />

      {value.lat && value.lng && (
        <>
          <LocationMap lat={value.lat} lng={value.lng} />

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            {value.venue_name && (
              <p className="font-medium">{value.venue_name}</p>
            )}
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
              href={`https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`}
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
      )}
    </div>
  );
}

export function LocationPicker({ value, onChange, onTimezoneDetected }: LocationPickerProps) {
  const [useManual, setUseManual] = useState(!API_KEY);

  const handleFallback = useCallback(() => setUseManual(true), []);

  if (useManual) {
    return <ManualLocationInputs value={value} onChange={onChange} />;
  }

  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      <GoogleMapsContent
        value={value}
        onChange={onChange}
        onFallback={handleFallback}
      />
    </APIProvider>
  );
}

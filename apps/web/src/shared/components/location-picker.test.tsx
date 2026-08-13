import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocationPicker, parseNominatimResult } from "./location-picker";
import type { NominatimResult, LocationData } from "./location-picker";

// Mock leaflet since jsdom can't render maps
vi.mock("leaflet", () => {
  const markerInstance = { addTo: vi.fn().mockReturnThis(), remove: vi.fn() };
  const tileLayerInstance = { addTo: vi.fn().mockReturnThis() };
  const mapInstance = {
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    eachLayer: vi.fn((cb: (layer: unknown) => void) => cb(markerInstance)),
  };
  return {
    default: {
      map: vi.fn(() => mapInstance),
      tileLayer: vi.fn(() => tileLayerInstance),
      marker: vi.fn(() => markerInstance),
      divIcon: vi.fn(() => ({})),
      Marker: class {},
    },
  };
});

// Mock leaflet CSS import
vi.mock("leaflet/dist/leaflet.css", () => ({}));

// Mock @attendly/ui/components
vi.mock("@attendly/ui/components", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

// ──────────────────────────────────────────────
// parseNominatimResult — pure function tests
// ──────────────────────────────────────────────

describe("parseNominatimResult", () => {
  it("parses a full address with street number, road, city, state, zip, country", () => {
    const result: NominatimResult = {
      place_id: 12345,
      display_name: "123 Main St, Springfield, IL 62701, USA",
      lat: "39.7817",
      lon: "-89.6501",
      address: {
        house_number: "123",
        road: "Main Street",
        suburb: "Downtown",
        city: "Springfield",
        state: "Illinois",
        postcode: "62701",
        country: "United States",
      },
    };

    const parsed = parseNominatimResult(result);

    expect(parsed.place_id).toBe("12345");
    expect(parsed.formatted_address).toBe("123 Main St, Springfield, IL 62701, USA");
    expect(parsed.address_lines).toEqual(["123 Main Street", "Downtown"]);
    expect(parsed.city).toBe("Springfield");
    expect(parsed.state).toBe("Illinois");
    expect(parsed.zip).toBe("62701");
    expect(parsed.country).toBe("United States");
    expect(parsed.lat).toBe(39.7817);
    expect(parsed.lng).toBe(-89.6501);
  });

  it("falls back to town when city is missing", () => {
    const result: NominatimResult = {
      place_id: 100,
      display_name: "A town",
      lat: "10",
      lon: "20",
      address: {
        town: "Smallville",
        state: "Kansas",
        country: "USA",
      },
    };

    const parsed = parseNominatimResult(result);
    expect(parsed.city).toBe("Smallville");
  });

  it("falls back to village when city and town are missing", () => {
    const result: NominatimResult = {
      place_id: 200,
      display_name: "A village",
      lat: "10",
      lon: "20",
      address: {
        village: "Tiny Village",
        country: "Somewhere",
      },
    };

    const parsed = parseNominatimResult(result);
    expect(parsed.city).toBe("Tiny Village");
  });

  it("returns empty strings for missing address fields", () => {
    const result: NominatimResult = {
      place_id: 300,
      display_name: "Unknown Place",
      lat: "0",
      lon: "0",
      address: {},
    };

    const parsed = parseNominatimResult(result);
    expect(parsed.city).toBe("");
    expect(parsed.state).toBe("");
    expect(parsed.zip).toBe("");
    expect(parsed.country).toBe("");
    expect(parsed.address_lines).toEqual([]);
  });

  it("omits suburb from address_lines when not provided", () => {
    const result: NominatimResult = {
      place_id: 400,
      display_name: "Some road",
      lat: "1",
      lon: "2",
      address: {
        house_number: "42",
        road: "Oak Avenue",
        city: "Portland",
        state: "Oregon",
        postcode: "97201",
        country: "USA",
      },
    };

    const parsed = parseNominatimResult(result);
    expect(parsed.address_lines).toEqual(["42 Oak Avenue"]);
  });

  it("converts place_id number to string", () => {
    const result: NominatimResult = {
      place_id: 999999,
      display_name: "Test",
      lat: "0",
      lon: "0",
      address: {},
    };

    expect(parseNominatimResult(result).place_id).toBe("999999");
  });
});

// ──────────────────────────────────────────────
// LocationPicker — component tests
// ──────────────────────────────────────────────

describe("LocationPicker", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input when no location is set", () => {
    render(<LocationPicker value={{}} onChange={onChange} />);
    expect(screen.getByPlaceholderText("Search for an address or place...")).toBeInTheDocument();
  });

  it("does not show map or address details when no location is set", () => {
    render(<LocationPicker value={{}} onChange={onChange} />);
    expect(screen.queryByText("Open in Maps")).not.toBeInTheDocument();
    expect(screen.queryByText("Reset location")).not.toBeInTheDocument();
  });

  it("shows address details, venue name input, and action buttons when location has lat/lng", () => {
    const value: LocationData = {
      lat: 14.535,
      lng: 120.982,
      venue_name: "SM Mall of Asia",
      address_lines: ["Seaside Boulevard"],
      city: "Pasay",
      state: "Metro Manila",
      zip: "1300",
      country: "Philippines",
    };

    render(<LocationPicker value={value} onChange={onChange} />);

    expect(screen.getByText("Seaside Boulevard")).toBeInTheDocument();
    expect(screen.getByText("Pasay, Metro Manila, 1300")).toBeInTheDocument();
    expect(screen.getByText("Philippines")).toBeInTheDocument();
    expect(screen.getByText("Open in Maps")).toBeInTheDocument();
    expect(screen.getByText("Reset location")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SM Mall of Asia")).toBeInTheDocument();
  });

  it("calls onChange with empty object when reset is clicked", async () => {
    const value: LocationData = {
      lat: 14.535,
      lng: 120.982,
      venue_name: "Test",
    };

    render(<LocationPicker value={value} onChange={onChange} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Reset location"));
    });

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("renders Open in Maps link with correct OpenStreetMap URL", () => {
    const value: LocationData = {
      lat: 40.7128,
      lng: -74.006,
    };

    render(<LocationPicker value={value} onChange={onChange} />);

    const link = screen.getByText("Open in Maps").closest("a");
    expect(link).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/?mlat=40.7128&mlon=-74.006#map=16/40.7128/-74.006"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("updates venue name when user types in the venue name field", async () => {
    const value: LocationData = {
      lat: 14.535,
      lng: 120.982,
      venue_name: "",
    };

    render(<LocationPicker value={value} onChange={onChange} />);

    const venueInput = screen.getByPlaceholderText("Convention Center");
    await act(async () => {
      fireEvent.change(venueInput, { target: { value: "My Venue" } });
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ venue_name: "My Venue" })
    );
  });
});

// ──────────────────────────────────────────────
// AddressAutocomplete — search behavior
// ──────────────────────────────────────────────

describe("AddressAutocomplete (via LocationPicker)", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not search when query is less than 3 characters", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<LocationPicker value={{}} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Search for an address or place...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "SM" } });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("searches Nominatim after debounce when query is 3+ characters", async () => {
    const mockResults: NominatimResult[] = [
      {
        place_id: 12345,
        display_name: "SM Mall of Asia, Pasay, Philippines",
        lat: "14.535",
        lon: "120.982",
        address: {
          road: "Seaside Boulevard",
          city: "Pasay",
          state: "Metro Manila",
          postcode: "1300",
          country: "Philippines",
        },
      },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      json: () => Promise.resolve(mockResults),
    } as Response);

    render(<LocationPicker value={{}} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Search for an address or place...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "SM Mall" } });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("nominatim.openstreetmap.org/search"),
        expect.objectContaining({ headers: { "Accept-Language": "en" } })
      );
    });
  });

  it("displays search results as dropdown buttons", async () => {
    const mockResults: NominatimResult[] = [
      {
        place_id: 1,
        display_name: "Result One, City, Country",
        lat: "10",
        lon: "20",
        address: { city: "City", country: "Country" },
      },
      {
        place_id: 2,
        display_name: "Result Two, Town, Country",
        lat: "11",
        lon: "21",
        address: { town: "Town", country: "Country" },
      },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      json: () => Promise.resolve(mockResults),
    } as Response);

    render(<LocationPicker value={{}} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Search for an address or place...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Result" } });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("Result One, City, Country")).toBeInTheDocument();
      expect(screen.getByText("Result Two, Town, Country")).toBeInTheDocument();
    });
  });

  it("calls onChange with parsed location when a result is selected", async () => {
    const mockResults: NominatimResult[] = [
      {
        place_id: 555,
        display_name: "123 Main St, Springfield, IL, USA",
        lat: "39.78",
        lon: "-89.65",
        address: {
          house_number: "123",
          road: "Main Street",
          city: "Springfield",
          state: "Illinois",
          postcode: "62701",
          country: "United States",
        },
      },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      json: () => Promise.resolve(mockResults),
    } as Response);

    render(<LocationPicker value={{}} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Search for an address or place...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "123 Main" } });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("123 Main St, Springfield, IL, USA")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("123 Main St, Springfield, IL, USA"));
    });

    expect(onChange).toHaveBeenCalledWith({
      place_id: "555",
      formatted_address: "123 Main St, Springfield, IL, USA",
      address_lines: ["123 Main Street"],
      city: "Springfield",
      state: "Illinois",
      zip: "62701",
      country: "United States",
      lat: 39.78,
      lng: -89.65,
    });
  });

  it("handles fetch errors gracefully without crashing", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

    render(<LocationPicker value={{}} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Search for an address or place...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Some place" } });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Should not crash, no results shown
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Some place/ })).not.toBeInTheDocument();
    });
  });
});

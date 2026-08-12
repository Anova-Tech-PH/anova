"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Textarea, Card, CardContent } from "@attendly/ui/components";
import { updateLogistics } from "../actions";
import type { EventLogistics, Hotel, Contact, CustomSection } from "../queries";

export function LogisticsEditor({
  eventId,
  initialData,
}: {
  eventId: string;
  initialData: EventLogistics;
}) {
  const [saving, setSaving] = useState(false);
  const [venueDescription, setVenueDescription] = useState(initialData.venue_description);
  const [venueMapUrl, setVenueMapUrl] = useState(initialData.venue_map_url);
  const [parking, setParking] = useState(initialData.logistics.parking ?? { title: "", body: "" });
  const [transportation, setTransportation] = useState(initialData.logistics.transportation ?? { title: "", body: "" });
  const [wifi, setWifi] = useState(initialData.logistics.wifi ?? { network: "", password: "" });
  const [hotels, setHotels] = useState<Hotel[]>(initialData.logistics.hotels ?? []);
  const [contacts, setContacts] = useState<Contact[]>(initialData.logistics.contacts ?? []);
  const [customSections, setCustomSections] = useState<CustomSection[]>(initialData.logistics.customSections ?? []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateLogistics(eventId, {
        venue_description: venueDescription,
        venue_map_url: venueMapUrl,
        logistics: {
          parking,
          transportation,
          wifi,
          hotels,
          contacts,
          customSections,
        },
      });
      toast.success("Logistics saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Logistics</h2>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Venue */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold">Venue Information</h3>
          <div>
            <label className="text-sm font-medium">Venue Description</label>
            <Textarea
              value={venueDescription}
              onChange={(e) => setVenueDescription(e.target.value)}
              placeholder="Describe the venue, location, how to get there..."
              rows={4}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Map URL</label>
            <Input
              value={venueMapUrl}
              onChange={(e) => setVenueMapUrl(e.target.value)}
              placeholder="Google Maps embed URL or link"
            />
          </div>
        </CardContent>
      </Card>

      {/* Parking */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold">Parking</h3>
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={parking.title}
              onChange={(e) => setParking({ ...parking, title: e.target.value })}
              placeholder="e.g. On-site Parking"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Details</label>
            <Textarea
              value={parking.body}
              onChange={(e) => setParking({ ...parking, body: e.target.value })}
              placeholder="Parking instructions, rates, etc."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transportation */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold">Transportation</h3>
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={transportation.title}
              onChange={(e) => setTransportation({ ...transportation, title: e.target.value })}
              placeholder="e.g. Getting There"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Details</label>
            <Textarea
              value={transportation.body}
              onChange={(e) => setTransportation({ ...transportation, body: e.target.value })}
              placeholder="Public transit, shuttle info, etc."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* WiFi */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold">WiFi</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Network Name</label>
              <Input
                value={wifi.network}
                onChange={(e) => setWifi({ ...wifi, network: e.target.value })}
                placeholder="WiFi network name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                value={wifi.password}
                onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                placeholder="WiFi password"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hotels */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Hotels</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHotels([...hotels, { name: "", url: "", distance: "", rate: "" }])}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Hotel
            </Button>
          </div>
          {hotels.map((hotel, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-4">
              <div>
                <label className="text-xs font-medium">Name</label>
                <Input
                  value={hotel.name}
                  onChange={(e) => {
                    const updated = [...hotels];
                    updated[i] = { ...hotel, name: e.target.value };
                    setHotels(updated);
                  }}
                  placeholder="Hotel name"
                />
              </div>
              <div>
                <label className="text-xs font-medium">URL</label>
                <Input
                  value={hotel.url ?? ""}
                  onChange={(e) => {
                    const updated = [...hotels];
                    updated[i] = { ...hotel, url: e.target.value };
                    setHotels(updated);
                  }}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-xs font-medium">Distance</label>
                <Input
                  value={hotel.distance ?? ""}
                  onChange={(e) => {
                    const updated = [...hotels];
                    updated[i] = { ...hotel, distance: e.target.value };
                    setHotels(updated);
                  }}
                  placeholder="e.g. 0.5 miles"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium">Rate</label>
                  <Input
                    value={hotel.rate ?? ""}
                    onChange={(e) => {
                      const updated = [...hotels];
                      updated[i] = { ...hotel, rate: e.target.value };
                      setHotels(updated);
                    }}
                    placeholder="e.g. $150/night"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHotels(hotels.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Contacts</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setContacts([...contacts, { name: "", phone: "", email: "" }])}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Contact
            </Button>
          </div>
          {contacts.map((contact, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium">Name</label>
                <Input
                  value={contact.name}
                  onChange={(e) => {
                    const updated = [...contacts];
                    updated[i] = { ...contact, name: e.target.value };
                    setContacts(updated);
                  }}
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Phone</label>
                <Input
                  value={contact.phone ?? ""}
                  onChange={(e) => {
                    const updated = [...contacts];
                    updated[i] = { ...contact, phone: e.target.value };
                    setContacts(updated);
                  }}
                  placeholder="Phone number"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium">Email</label>
                  <Input
                    value={contact.email ?? ""}
                    onChange={(e) => {
                      const updated = [...contacts];
                      updated[i] = { ...contact, email: e.target.value };
                      setContacts(updated);
                    }}
                    placeholder="Email address"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Custom Sections */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Custom Sections</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomSections([...customSections, { title: "", body: "" }])}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Section
            </Button>
          </div>
          {customSections.map((section, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium">Title</label>
                  <Input
                    value={section.title}
                    onChange={(e) => {
                      const updated = [...customSections];
                      updated[i] = { ...section, title: e.target.value };
                      setCustomSections(updated);
                    }}
                    placeholder="Section title"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-5"
                  onClick={() => setCustomSections(customSections.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div>
                <label className="text-xs font-medium">Body</label>
                <Textarea
                  value={section.body}
                  onChange={(e) => {
                    const updated = [...customSections];
                    updated[i] = { ...section, body: e.target.value };
                    setCustomSections(updated);
                  }}
                  placeholder="Section content..."
                  rows={3}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

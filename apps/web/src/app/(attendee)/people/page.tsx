import { Users } from "lucide-react";

export default function PeoplePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">People</h1>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h3 className="font-medium">Coming Soon</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Browse attendees, connect, and grow your network.
        </p>
      </div>
    </div>
  );
}

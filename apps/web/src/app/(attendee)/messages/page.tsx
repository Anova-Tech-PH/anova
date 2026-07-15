import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Messages</h1>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <MessageCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h3 className="font-medium">Coming Soon</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Direct and group messaging with other attendees.
        </p>
      </div>
    </div>
  );
}

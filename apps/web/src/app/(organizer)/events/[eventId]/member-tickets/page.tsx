import { ShieldCheck } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function MemberTicketsPage() {
  return (
    <ComingSoon
      title="Member & Invite-Only Ticketing"
      description="Restrict tickets using access codes, invited email lists, or organization domain restrictions. Manage pre-approved attendee lists and send invitation emails."
      icon={<ShieldCheck className="h-7 w-7" />}
    />
  );
}

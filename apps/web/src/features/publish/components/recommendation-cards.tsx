import Link from "next/link";
import {
  Megaphone, QrCode, IdCard, ClipboardList, CalendarCheck,
  Mail, BarChart2, FileText, Users, Globe,
} from "lucide-react";
import type { RecommendationCard } from "../queries";

const cardIcons: Record<string, React.ReactNode> = {
  announcements: <Megaphone className="h-5 w-5" />,
  "check-in": <QrCode className="h-5 w-5" />,
  badges: <IdCard className="h-5 w-5" />,
  survey: <ClipboardList className="h-5 w-5" />,
  rsvp: <CalendarCheck className="h-5 w-5" />,
  "email-campaign": <Mail className="h-5 w-5" />,
  polls: <BarChart2 className="h-5 w-5" />,
  documents: <FileText className="h-5 w-5" />,
  meetups: <Users className="h-5 w-5" />,
  website: <Globe className="h-5 w-5" />,
};

export function RecommendationCards({ cards }: { cards: RecommendationCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <div
          key={card.id}
          className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                {cardIcons[card.id] ?? <Globe className="h-5 w-5" />}
              </div>
              <h3 className="font-medium text-sm">{card.name}</h3>
            </div>
            <span
              className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                card.configured
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {card.configured ? "Configured" : "Not set up"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {card.description}
          </p>
          <Link
            href={card.href}
            className="mt-auto inline-flex items-center text-xs font-medium text-[oklch(0.445_0.107_195)] hover:underline"
          >
            {card.configured ? "View" : "Set up now"} &rarr;
          </Link>
        </div>
      ))}
    </div>
  );
}

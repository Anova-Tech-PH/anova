import type { ReactNode } from "react";
import { Construction } from "lucide-react";
import { Badge } from "@attendly/ui/components";

interface ComingSoonProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function ComingSoon({ title, description, icon }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-20 text-center px-6">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        {icon ?? <Construction className="h-7 w-7" />}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Badge variant="default" className="mt-4">
        Coming Soon
      </Badge>
    </div>
  );
}

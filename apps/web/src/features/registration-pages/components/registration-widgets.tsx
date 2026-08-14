"use client";

import { useState } from "react";
import { Check, Copy, Code } from "lucide-react";
import { Button, Card } from "@attendly/ui/components";
import { toast } from "sonner";

export function RegistrationWidgets({
  registrationUrl,
}: {
  registrationUrl: string;
}) {
  const buttonEmbed = `<a href="${registrationUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-family:system-ui,sans-serif;">Register Now</a>`;

  const iframeEmbed = `<iframe src="${registrationUrl}?embed=true" width="100%" height="600" frameborder="0" style="border:none;border-radius:8px;"></iframe>`;

  return (
    <div className="space-y-6">
      <EmbedSnippet
        title="Register Button"
        description="A styled button that links to your registration page. Paste this HTML into your website."
        code={buttonEmbed}
        preview={
          <a
            href="#"
            style={{
              display: "inline-block",
              background: "#2563eb",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Register Now
          </a>
        }
      />
      <EmbedSnippet
        title="Inline Registration Form"
        description="Embed the full registration form directly on your website using an iframe."
        code={iframeEmbed}
      />
    </div>
  );
}

function EmbedSnippet({
  title,
  description,
  code,
  preview,
}: {
  title: string;
  description: string;
  code: string;
  preview?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Code className="h-4 w-4" />
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          {copied ? (
            <Check className="mr-1.5 h-4 w-4" />
          ) : (
            <Copy className="mr-1.5 h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {preview && (
        <div className="mb-4 rounded-lg border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Preview
          </p>
          {preview}
        </div>
      )}
      <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
        <code>{code}</code>
      </pre>
    </Card>
  );
}

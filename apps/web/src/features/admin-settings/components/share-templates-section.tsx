"use client";

import { useState, useTransition } from "react";
import {
  Card,
  Input,
  Button,
  Badge,
  Textarea,
  ModalOverlay,
} from "@attendly/ui/components";
import { Share2, Mail, Building2, ArrowDownToLine, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { SharedTemplate, TemplateRequest } from "../queries";
import {
  shareTemplate,
  requestTemplate,
  updateTemplateRequestStatus,
} from "../actions";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "info" | "outline"> = {
  pending: "warning",
  accepted: "success",
  approved: "success",
  declined: "destructive",
  rejected: "destructive",
};

function statusVariant(status: string) {
  return STATUS_VARIANT[status] ?? "default";
}

export function ShareTemplatesSection({
  eventId,
  sharedTemplates,
  incomingRequests,
  outgoingRequests,
}: {
  eventId: string;
  sharedTemplates: SharedTemplate[];
  incomingRequests: TemplateRequest[];
  outgoingRequests: TemplateRequest[];
}) {
  const [showShareIndividual, setShowShareIndividual] = useState(false);
  const [showShareOrg, setShowShareOrg] = useState(false);
  const [showRequest, setShowRequest] = useState(false);

  const [shareEmail, setShareEmail] = useState("");
  const [shareOrgId, setShareOrgId] = useState("");
  const [requestEventId, setRequestEventId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  const [isPending, startTransition] = useTransition();

  const pendingIncoming = incomingRequests.filter(
    (r) => r.status === "pending"
  );

  function handleShareIndividual() {
    if (!shareEmail.trim()) return;
    startTransition(async () => {
      try {
        await shareTemplate(eventId, { email: shareEmail.trim() });
        toast.success("Template shared successfully");
        setShareEmail("");
        setShowShareIndividual(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to share template"
        );
      }
    });
  }

  function handleShareOrg() {
    if (!shareOrgId.trim()) return;
    startTransition(async () => {
      try {
        await shareTemplate(eventId, { orgId: shareOrgId.trim() });
        toast.success("Template shared with organization");
        setShareOrgId("");
        setShowShareOrg(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to share template"
        );
      }
    });
  }

  function handleRequest() {
    if (!requestEventId.trim()) return;
    startTransition(async () => {
      try {
        await requestTemplate(
          eventId,
          requestEventId.trim(),
          requestMessage.trim() || undefined
        );
        toast.success("Template request sent");
        setRequestEventId("");
        setRequestMessage("");
        setShowRequest(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to send request"
        );
      }
    });
  }

  function handleRequestAction(requestId: string, status: string) {
    startTransition(async () => {
      try {
        await updateTemplateRequestStatus(requestId, eventId, status);
        toast.success(
          status === "approved" ? "Request approved" : "Request declined"
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update request"
        );
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
          <h2 className="font-semibold">
            Share Event Templates and Settings
          </h2>
          <Badge variant="info">NEW</Badge>
        </div>
      </div>

      <div className="space-y-6 px-6 py-4">
        {/* Share section */}
        <div>
          <p className="text-sm text-muted-foreground">
            Share your event templates and settings with other organizers so
            they can use them as a starting point for their own events.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowShareIndividual(true)}
            >
              <Mail className="mr-2 h-4 w-4" />
              Share with an individual
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowShareOrg(true)}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Share with an organization
            </Button>
          </div>

          {sharedTemplates.length > 0 && (
            <div className="mt-4 space-y-2">
              {sharedTemplates.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {st.shared_with_email
                      ? `Shared with ${st.shared_with_email}`
                      : `Shared with org ${st.shared_with_org_id}`}
                  </span>
                  <Badge variant={statusVariant(st.status)}>
                    {st.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <hr className="border-border" />

        {/* Request section */}
        <div>
          <p className="text-sm text-muted-foreground">
            Request templates and settings from another event to use as a
            starting point for this event.
          </p>
          <div className="mt-3">
            <Button variant="outline" onClick={() => setShowRequest(true)}>
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Request templates
            </Button>
          </div>

          {outgoingRequests.length > 0 && (
            <div className="mt-4 space-y-2">
              {outgoingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    Requested from{" "}
                    {req.event_name ?? req.target_event_id}
                  </span>
                  <Badge variant={statusVariant(req.status)}>
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming requests */}
        {pendingIncoming.length > 0 && (
          <>
            <hr className="border-border" />
            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Incoming Requests ({pendingIncoming.length})
              </h3>
              <div className="space-y-2">
                {pendingIncoming.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {req.event_name ?? req.requesting_event_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested by {req.requester_name ?? "Unknown"}
                        {req.message && ` -- "${req.message}"`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleRequestAction(req.id, "approved")
                        }
                        disabled={isPending}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRequestAction(req.id, "declined")
                        }
                        disabled={isPending}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Share with individual dialog */}
      {showShareIndividual && (
        <ModalOverlay onClose={() => setShowShareIndividual(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Share with an Individual
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="organizer@example.com"
                  disabled={isPending}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowShareIndividual(false);
                    setShareEmail("");
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleShareIndividual}
                  disabled={isPending || !shareEmail.trim()}
                >
                  {isPending ? "Sharing..." : "Share"}
                </Button>
              </div>
            </div>
          </Card>
        </ModalOverlay>
      )}

      {/* Share with organization dialog */}
      {showShareOrg && (
        <ModalOverlay onClose={() => setShowShareOrg(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Share with an Organization
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Organization ID
                </label>
                <Input
                  type="text"
                  value={shareOrgId}
                  onChange={(e) => setShareOrgId(e.target.value)}
                  placeholder="Enter organization ID"
                  disabled={isPending}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowShareOrg(false);
                    setShareOrgId("");
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleShareOrg}
                  disabled={isPending || !shareOrgId.trim()}
                >
                  {isPending ? "Sharing..." : "Share"}
                </Button>
              </div>
            </div>
          </Card>
        </ModalOverlay>
      )}

      {/* Request templates dialog */}
      {showRequest && (
        <ModalOverlay onClose={() => setShowRequest(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Request Templates
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Event ID
                </label>
                <Input
                  type="text"
                  value={requestEventId}
                  onChange={(e) => setRequestEventId(e.target.value)}
                  placeholder="Enter the event ID to request from"
                  disabled={isPending}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Message (optional)
                </label>
                <Textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Add a message to the event organizer..."
                  disabled={isPending}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRequest(false);
                    setRequestEventId("");
                    setRequestMessage("");
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequest}
                  disabled={isPending || !requestEventId.trim()}
                >
                  {isPending ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </div>
          </Card>
        </ModalOverlay>
      )}
    </Card>
  );
}

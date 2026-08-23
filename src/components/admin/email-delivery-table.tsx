"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  Mail,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Skull,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { retryDeadEmailAction, triggerProcessEmailQueueAction } from "@/app/actions/admin";
import { EmailStatus, EmailType } from "@prisma/client";

interface EmailDeliveryTableProps {
  stats: {
    sent: number;
    pending: number;
    failed: number;
    dead: number;
    total: number;
  };
  deadEmails: Array<{
    id: string;
    toEmail: string;
    type: EmailType;
    status: EmailStatus;
    attempts: number;
    lastError?: string | null;
    createdAt: Date | string;
    appointment?: {
      patient?: { name: string; email: string };
      doctor?: { user: { name: string } };
    } | null;
  }>;
}

export function EmailDeliveryDashboard({ stats, deadEmails }: EmailDeliveryTableProps) {
  const router = useRouter();
  const [isProcessingQueue, setIsProcessingQueue] = React.useState(false);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    try {
      const res = await triggerProcessEmailQueueAction();
      if (!res.success) {
        toast.error(res.error || "Failed to trigger email queue worker.");
      } else {
        toast.success(res.message || "Email queue processed!");
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleRetryEmail = async (emailLogId: string) => {
    setRetryingId(emailLogId);
    try {
      const res = await retryDeadEmailAction(emailLogId);
      if (!res.success) {
        toast.error(res.error || "Failed to reset email.");
      } else {
        toast.success(res.message || "Email reset to PENDING!");
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message || "An unexpected error occurred.");
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: EmailStatus) => {
    switch (status) {
      case "SENT":
        return <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">SENT</Badge>;
      case "PENDING":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-[10px]">PENDING</Badge>;
      case "FAILED":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">FAILED</Badge>;
      case "DEAD":
        return <Badge variant="destructive" className="text-[10px]">DEAD (5/5)</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sent */}
        <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Delivered (SENT)
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-200">
              {stats.sent}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground pt-0">
            Successfully delivered via SMTP
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-blue-500/20 bg-blue-500/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Queued (PENDING)
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-blue-800 dark:text-blue-200">
              {stats.pending}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground pt-0">
            Waiting for next QStash cycle
          </CardContent>
        </Card>

        {/* Failed */}
        <Card className="border-amber-500/20 bg-amber-500/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Retrying (FAILED)
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-200">
              {stats.failed}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground pt-0">
            Attempts &lt; 5 (Auto-retrying)
          </CardContent>
        </Card>

        {/* Dead */}
        <Card className="border-red-500/20 bg-red-500/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <Skull className="h-4 w-4" /> Dead Letter (DEAD)
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-red-800 dark:text-red-200">
              {stats.dead}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground pt-0">
            5 failed attempts (Manual retry required)
          </CardContent>
        </Card>
      </div>

      {/* Dead / Failed Email Queue Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Inbox className="h-4 w-4 text-primary" />
                Dead &amp; Failed Email Delivery Queue
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect deliverability issues and manually trigger retries
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.refresh()}
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleProcessQueue}
                disabled={isProcessingQueue}
                className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground"
              >
                {isProcessingQueue ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Retrying Failed Emails...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry Failed Emails
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="text-xs">
          {deadEmails.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="font-semibold text-foreground text-sm">All Email Pipelines Healthy</p>
              <p className="text-xs mt-0.5">
                No failed or dead email notifications in queue. All transactional messages delivered.
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-card overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted/40 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="col-span-3">Recipient</div>
                <div className="col-span-3">Notification Type</div>
                <div className="col-span-2">Status / Tries</div>
                <div className="col-span-3">Last Failure Reason</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {deadEmails.map((email) => (
                <div key={email.id} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-muted/20">
                  <div className="col-span-3">
                    <span className="font-mono font-bold text-foreground block truncate">
                      {email.toEmail}
                    </span>
                    {email.appointment?.patient && (
                      <span className="text-[11px] text-muted-foreground">
                        {email.appointment.patient.name}
                      </span>
                    )}
                  </div>

                  <div className="col-span-3">
                    <span className="font-semibold text-foreground block text-xs">
                      {email.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {format(new Date(email.createdAt), "MMM d, hh:mm a")}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center gap-1.5">
                    {getStatusBadge(email.status)}
                    <span className="font-mono text-[11px] text-muted-foreground font-bold">
                      ({email.attempts}/5)
                    </span>
                  </div>

                  <div className="col-span-3">
                    <p className="text-[11px] text-destructive font-mono truncate" title={email.lastError || "Unknown error"}>
                      {email.lastError || "No detailed error message recorded"}
                    </p>
                  </div>

                  <div className="col-span-1 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={retryingId === email.id}
                      onClick={() => handleRetryEmail(email.id)}
                      className="h-7 px-2 text-[11px] gap-1 hover:bg-primary hover:text-primary-foreground"
                    >
                      {retryingId === email.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getGoogleCalendarStatusAction,
  disconnectGoogleCalendarAction,
} from "@/app/actions/google-calendar";

export function GoogleCalendarCard({
  title = "Google Calendar Sync",
  description = "Automatically sync all scheduled consultations to your personal Google Calendar.",
}: {
  title?: string;
  description?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isConnected, setIsConnected] = React.useState(false);
  const [connectedEmail, setConnectedEmail] = React.useState<string | undefined>();
  const [needsReauth, setNeedsReauth] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);

  const fetchStatus = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getGoogleCalendarStatusAction();
      if (res.success) {
        setIsConnected(res.isConnected);
        setConnectedEmail(res.connectedEmail);
        setNeedsReauth(res.needsReauth);
      }
    } catch (err) {
      console.error("Error checking calendar status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle URL query feedback
  React.useEffect(() => {
    const calendarStatus = searchParams.get("calendar_status");
    const calendarError = searchParams.get("calendar_error");

    if (calendarStatus === "connected") {
      toast.success("Google Calendar connected successfully! Your appointments will now sync automatically.");
      fetchStatus();
    } else if (calendarError) {
      toast.error(`Google Calendar connection failed: ${calendarError.replace(/_/g, " ")}`);
    }
  }, [searchParams, fetchStatus]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await disconnectGoogleCalendarAction();
      if (!res.success) {
        toast.error(res.error || "Failed to disconnect Google Calendar.");
      } else {
        toast.success("Google Calendar disconnected.");
        setIsConnected(false);
        setConnectedEmail(undefined);
        setNeedsReauth(false);
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const connectUrl = `/api/auth/google-calendar/connect?returnUrl=${encodeURIComponent(pathname)}`;

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>

          {!isLoading && (
            <Badge
              variant={
                needsReauth
                  ? "destructive"
                  : isConnected
                  ? "default"
                  : "secondary"
              }
              className={`text-[10px] ${
                isConnected && !needsReauth ? "bg-emerald-600 text-white" : ""
              }`}
            >
              {needsReauth
                ? "Re-Auth Required"
                : isConnected
                ? "Connected"
                : "Not Connected"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Checking Google Calendar connection...</span>
          </div>
        ) : needsReauth ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Authorization Expired</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Your Google Calendar permissions have expired or were revoked. Reconnect to resume automatic calendar synchronization for all appointments.
            </p>
            <div className="pt-1">
              <Button size="sm" asChild className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                <a href={connectUrl}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reconnect Google Calendar
                </a>
              </Button>
            </div>
          </div>
        ) : isConnected ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-foreground block">
                  Active Calendar Sync
                </span>
                <span className="font-mono text-muted-foreground text-[11px]">
                  {connectedEmail || "Google Account Connected"}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
            >
              {isDisconnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5" />
                  Disconnect
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3.5">
            <div className="text-muted-foreground text-xs leading-relaxed">
              Connect your Google account to get real-time 2-way consultation synchronization with custom reminders and links.
            </div>

            <Button size="sm" asChild className="h-8 text-xs gap-1.5 shrink-0 bg-primary text-primary-foreground">
              <a href={connectUrl}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Connect Google Calendar
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

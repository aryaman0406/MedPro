"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Calendar, Pill, AlertTriangle, Users, CheckCheck, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserNotificationsAction, type UserNotification } from "@/app/actions/notifications";

export function NotificationDropdown() {
  const [notifications, setNotifications] = React.useState<UserNotification[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [hasUnread, setHasUnread] = React.useState<boolean>(true);
  const [open, setOpen] = React.useState<boolean>(false);

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUserNotificationsAction();
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchNotifications();
    }
  };

  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasUnread(false);
  };

  const getNotificationIcon = (type: UserNotification["type"]) => {
    switch (type) {
      case "appointment":
        return <Calendar className="h-4 w-4 text-blue-500 shrink-0" />;
      case "medication":
        return <Pill className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "queue":
        return <Users className="h-4 w-4 text-purple-500 shrink-0" />;
      case "urgent":
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case "system":
        return <Bell className="h-4 w-4 text-rose-500 shrink-0" />;
      default:
        return <Bell className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 relative rounded-full hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {hasUnread && notifications.length > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 sm:w-96" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between py-2 px-3 font-semibold">
          <div className="flex items-center gap-2">
            <span>Notifications</span>
            {hasUnread && notifications.length > 0 && (
              <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full">
                {notifications.length} new
              </span>
            )}
          </div>
          {hasUnread && notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-normal"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[340px] overflow-y-auto divide-y divide-border/40">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mb-2 text-muted-foreground">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">No new notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You&apos;re all caught up! Updates regarding appointments & queue status will appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <DropdownMenuItem key={item.id} asChild className="p-0 focus:bg-accent/60">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 p-3 transition-colors hover:bg-accent/50 cursor-pointer"
                >
                  <div className="mt-0.5 p-1.5 rounded-md bg-muted/60">
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold leading-none truncate text-foreground">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-1.5 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground justify-center h-8"
                onClick={() => setHasUnread(false)}
              >
                Clear notification badges
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

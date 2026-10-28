"use client";

import { useRouter } from "next/navigation";
import { BellOffIcon } from "lucide-react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { relativeTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";

export function NotificationsPopover() {
  const router = useRouter();
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAll = useAppStore((s) => s.markAllNotificationsRead);
  const clear = useAppStore((s) => s.clearNotifications);
  const now = useNow();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button size="icon" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative">
              <Icon name="bell" />
              {unread > 0 && (
                <span className="absolute top-[5px] right-[5px] size-1.5 rounded-full bg-brand ring-2 ring-surface" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={8} className="w-[360px] gap-0 p-0">
        <div className="flex h-12 items-center gap-2 border-b border-hairline px-4">
          <span className="t-14 flex-1 text-fg">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} className="t-12">
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear} className="t-12">
              Clear
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <BellOffIcon className="size-5 text-icon" />
            <p className="t-14 text-fg">You’re all caught up</p>
            <p className="t-12 text-fg-2">New approvals and reminders will show up here.</p>
          </div>
        ) : (
          <ul className="scroll-thin max-h-[360px] overflow-y-auto p-1">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    markRead(n.id);
                    if (n.href) router.push(n.href);
                  }}
                  className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover-fine:bg-hover"
                >
                  <span
                    className={cn("mt-1 size-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")}
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex items-baseline gap-2">
                      <span className="t-14 min-w-0 flex-1 truncate text-fg">{n.title}</span>
                      <span className="t-12 shrink-0 text-placeholder">{now ? relativeTime(n.createdAt, now) : ""}</span>
                    </span>
                    <span className="t-12 leading-[1.35] text-fg-2">{n.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

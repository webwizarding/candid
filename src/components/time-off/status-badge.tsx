import { BanIcon, Clock3Icon } from "lucide-react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { LeaveStatus } from "@/lib/types";

const STYLES: Record<LeaveStatus, { label: string; tone: string }> = {
  approved: { label: "Approved", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  pending: { label: "Pending", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function StatusBadge({ status, className }: { status: LeaveStatus; className?: string }) {
  const { label, tone } = STYLES[status];
  return (
    <span
      className={cn("inline-flex h-[22px] shrink-0 items-center gap-1 rounded-[6px] border pr-1.5 pl-1", className)}
      style={{
        background: `var(--status-${tone}-tint)`,
        borderColor: `var(--status-${tone}-border)`,
        color: `var(--status-${tone})`,
      }}
    >
      {status === "approved" && <Icon name="status-approved" className="text-success" />}
      {status === "declined" && <Icon name="status-declined" className="rotate-180 text-danger" />}
      {status === "pending" && <Clock3Icon className="size-3.5" strokeWidth={2.25} />}
      {status === "cancelled" && <BanIcon className="size-3.5" strokeWidth={2.25} />}
      <span className="salt text-[12px] leading-none tracking-[-0.24px] whitespace-nowrap">{label}</span>
    </span>
  );
}

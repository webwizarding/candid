import { cn } from "@/lib/utils";

export type IconName =
  | "nav-dashboard"
  | "nav-analytics"
  | "nav-personal"
  | "nav-documents"
  | "nav-calendar"
  | "nav-time-tracking"
  | "nav-benefits"
  | "nav-invoice"
  | "nav-withdrawal"
  | "workspace-switcher"
  | "search"
  | "help"
  | "bell"
  | "request-time-off"
  | "moon"
  | "settings"
  | "arrow-left"
  | "arrow-right"
  | "filter"
  | "more"
  | "status-approved"
  | "status-declined";

/**
 * Monochrome Figma icon rendered as a CSS mask so it inherits `currentColor`
 * (defaults to the design's icon grey) and follows the theme.
 */
export function Icon({
  name,
  size = 14,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const url = `url(/icons/${name}.svg)`;
  return (
    <span
      aria-hidden
      data-icon
      className={cn("inline-block shrink-0 bg-current text-icon", className)}
      style={{
        width: size,
        height: size,
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        ...style,
      }}
    />
  );
}

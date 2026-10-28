"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme = "light" } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-brand" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-danger" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--bg-surface)",
          "--normal-text": "var(--text-primary)",
          "--normal-border": "var(--border-hairline)",
          "--border-radius": "10px",
          "--width": "340px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!font-sans !gap-2.5 !shadow-[0_12px_32px_-8px_rgba(15,15,15,0.16)]",
          title: "t-14 salt",
          description: "t-12 !text-fg-2 !leading-[1.35]",
          actionButton: "!bg-fg !text-surface !rounded-md !t-12 !font-medium",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

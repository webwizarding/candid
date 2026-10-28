"use client";

import { useState } from "react";
import { CheckIcon, PlusIcon } from "lucide-react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { selectWorkspaceName, useAppStore } from "@/stores/app-store";

export function Brand({ className }: { className?: string }) {
  const name = useAppStore(selectWorkspaceName);
  const workspaces = useAppStore((s) => s.workspaces);
  const workspaceId = useAppStore((s) => s.workspaceId);
  const switchWorkspace = useAppStore((s) => s.switchWorkspace);
  const addWorkspace = useAppStore((s) => s.addWorkspace);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className={cn("flex h-full w-60 shrink-0 items-center gap-2 overflow-hidden border-r border-hairline px-3", className)}>
      <span className="salt truncate text-[16px] leading-none font-semibold tracking-[-0.48px] text-fg">{name}</span>
      <span className="h-px min-w-px flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" aria-label="Switch workspace">
            <Icon name="workspace-switcher" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-56">
          <DropdownMenuLabel className="t-12 text-fg-2">Workspaces</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} onSelect={() => switchWorkspace(w.id)}>
              <span className="flex size-5 items-center justify-center rounded-md bg-brand-tint text-[11px] font-semibold text-brand">
                {w.name[0]}
              </span>
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === workspaceId && <CheckIcon className="text-brand" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <PlusIcon /> Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={creating}
        onOpenChange={(v) => {
          setCreating(v);
          if (!v) setDraft("");
        }}
      >
        <DialogContent className="sm:max-w-[380px]">
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              addWorkspace(draft.trim());
              setCreating(false);
              setDraft("");
            }}
          >
            <DialogHeader>
              <DialogTitle className="t-16">Create workspace</DialogTitle>
              <DialogDescription className="t-14">Workspaces keep calendars and requests for a team together.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="ws-name" className="t-12 text-fg-2">
                Name
              </Label>
              <Input id="ws-name" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Design team" />
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={!draft.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarBody } from "./sidebar";
import { Brand } from "./workspace-switcher";

/** Below `lg` the sidebar slides in from the left. Closes itself on navigation. */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation" className="ml-2 lg:hidden">
          <MenuIcon className="size-4 text-fg" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" showCloseButton={false} className="w-[280px] max-w-[85vw] gap-0 border-hairline bg-app p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Pages, settings and your account</SheetDescription>
        <div className="h-[53px] shrink-0 border-b border-hairline">
          <Brand className="w-full border-r-0" />
        </div>
        <SidebarBody className="pb-[max(0.75rem,env(safe-area-inset-bottom))]" />
      </SheetContent>
    </Sheet>
  );
}

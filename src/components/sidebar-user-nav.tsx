"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useRef } from "react";

export function SidebarUserNav() {
  const userButtonRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger if the click wasn't on the UserButton itself
    const target = e.target as HTMLElement;
    const userButton = userButtonRef.current?.querySelector("button");

    // If clicked directly on UserButton or its children, let it handle naturally
    if (userButton && (userButton.contains(target) || userButton === target)) {
      return;
    }

    // Otherwise, programmatically click the UserButton
    if (userButton) {
      userButton.click();
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SignedOut>
          <SignInButton mode="modal">
            <SidebarMenuButton className="w-full">
              <span className="mr-2">→</span>
              Login
            </SidebarMenuButton>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <SidebarMenuButton className="w-full" onClick={handleClick}>
            <div ref={userButtonRef} className="flex items-center w-full">
              <UserButton />
              <span className="ml-2">Profile</span>
            </div>
          </SidebarMenuButton>
        </SignedIn>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useRef } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

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
          <div className="flex items-center justify-between w-full">
            <SignInButton mode="modal">
              <SidebarMenuButton className="flex-1">
                <span className="mr-2">→</span>
                Login
              </SidebarMenuButton>
            </SignInButton>
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </div>
        </SignedOut>
        <SignedIn>
          <div className="flex items-center justify-between w-full">
            <SidebarMenuButton className="flex-1" onClick={handleClick}>
              <div ref={userButtonRef} className="flex items-center w-full">
                <UserButton />
                <span className="ml-2">Profile</span>
              </div>
            </SidebarMenuButton>
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </div>
        </SignedIn>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

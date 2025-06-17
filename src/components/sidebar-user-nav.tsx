"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function SidebarUserNav() {
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
          <SidebarMenuButton className="w-full">
            <UserButton />
            <span className="ml-2">Profile</span>
          </SidebarMenuButton>
        </SignedIn>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

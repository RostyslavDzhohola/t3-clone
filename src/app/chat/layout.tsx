import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get sidebar state from cookies and user session from Clerk
  const [cookieStore, session] = await Promise.all([cookies(), auth()]);

  // Check if sidebar should be collapsed (defaultOpen means expanded)
  const isCollapsed = cookieStore.get("sidebar:state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar />
      <SidebarInset className="flex-1">{children}</SidebarInset>
    </SidebarProvider>
  );
}

"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SidebarSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function SidebarSearch({
  searchTerm,
  onSearchChange,
}: SidebarSearchProps) {
  return (
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-muted-foreground" />
      <Input
        placeholder="Search your chats..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-9 bg-input border-border"
      />
    </div>
  );
}

"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface DeleteChatDialogProps {
  chatTitle: string;
  onDelete: () => void;
  isDeleting?: boolean;
}

export default function DeleteChatDialog({
  chatTitle,
  onDelete,
  isDeleting = false,
}: DeleteChatDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        asChild
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation(); // Prevent triggering chat selection
        }}
      >
        <Trash2 className="h-4 w-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Chat</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{chatTitle}&quot;? This action
            cannot be undone and will permanently remove all messages in this
            chat.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

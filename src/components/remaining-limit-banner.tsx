"use client";

import React, { useState, useEffect } from "react";
import { SignInButton } from "@clerk/nextjs";
import { X } from "lucide-react";

interface RemainingLimitBannerProps {
  remaining: number;
  limitReached: boolean;
  onClose: () => void;
}

export default function RemainingLimitBanner({
  remaining,
  limitReached,
  onClose,
}: RemainingLimitBannerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render on server to avoid hydration mismatch
  if (!isMounted) {
    return null;
  }

  const bgColor = limitReached ? "#fee2e2" : "#fef3c7";
  const textColor = limitReached ? "#991b1b" : "#92400e";
  const borderColor = limitReached ? "#ef4444" : "#f59e0b";
  const message = limitReached
    ? "You've reached the message limit."
    : `You only have ${remaining} message${remaining !== 1 ? "s" : ""} left.`;

  return (
    <div
      style={{
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 14,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "fit-content",
        minWidth: "500px",
        maxWidth: "600px",
        boxShadow:
          "0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)",
        position: "relative",
      }}
    >
      <span>{message}</span>
      <SignInButton mode="modal">
        <span
          style={{ textDecoration: "underline", cursor: "pointer" }}
          data-clerk-element="signInButton"
        >
          Sign in to reset your limits
        </span>
      </SignInButton>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: textColor,
          cursor: "pointer",
          padding: "2px",
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          opacity: 0.7,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.7";
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

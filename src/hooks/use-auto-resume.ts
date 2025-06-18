"use client";

import { useEffect } from "react";
import type { Message } from "@ai-sdk/react";
import type { UseChatHelpers } from "@ai-sdk/react";

export type DataPart = { type: "append-message"; message: string };

export interface Props {
  autoResume: boolean;
  initialMessages: Message[];
  experimental_resume: UseChatHelpers["experimental_resume"];
  data: UseChatHelpers["data"];
  setMessages: UseChatHelpers["setMessages"];
}

export function useAutoResume({
  autoResume,
  initialMessages,
  experimental_resume,
  data,
  setMessages,
}: Props) {
  useEffect(() => {
    if (!autoResume) return;

    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === "user") {
      console.log("🔄 [CLIENT] Auto-resuming stream for last user message");
      experimental_resume();
    }

    // we intentionally run this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const dataPart = data[0] as DataPart;

    if (dataPart.type === "append-message") {
      const message = JSON.parse(dataPart.message) as Message;
      console.log("📬 [CLIENT] Received append-message:", message);
      setMessages([...initialMessages, message]);
    }
  }, [data, initialMessages, setMessages]);
}

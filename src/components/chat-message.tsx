"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo, useState } from "react";
import type { UIMessage } from "ai";
import { Markdown } from "./markdown";
import type { UseChatHelpers } from "@ai-sdk/react";

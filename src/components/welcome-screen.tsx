"use client";

import React from "react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function WelcomeScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            General Magic
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            An open-source AI chat application built for the{" "}
            <a
              href="https://cloneathon.t3.chat/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline transition-all duration-200"
              style={{ color: "rgb(244, 114, 182)" }}
            >
              T3 ChatCloneathon
            </a>
          </p>

          <div className="mb-8">
            <SignInButton mode="modal">
              <Button
                size="lg"
                className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 text-lg rounded-lg"
              >
                Sign In to Start Chatting
              </Button>
            </SignInButton>
            <p className="text-sm text-gray-500 mt-3">
              Sign in with Google to save your conversations
            </p>
          </div>

          <div className="pt-6 border-t border-gray-200 space-y-3">
            <div>
              <a
                href="https://cloneathon.t3.chat/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium transition-colors hover:underline"
                style={{ color: "rgb(244, 114, 182)" }}
              >
                Learn about the T3 ChatCloneathon
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
            <div>
              <a
                href="https://github.com/RostyslavDzhohola/t3-clone"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

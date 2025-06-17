"use client";

import React from "react";
import { Monitor, Smartphone, ArrowRight, Laptop, Github } from "lucide-react";

export default function MobileWarning() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Icon Section */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl scale-150"></div>
            <div className="relative bg-white rounded-full p-6 shadow-lg border border-blue-100">
              <Monitor className="h-12 w-12 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Desktop Experience Required
            </h1>
            <p className="text-gray-600 leading-relaxed mb-4">
              T3.1 Chat Clone is optimized for desktop and laptop computers to
              provide the best chat experience.
            </p>
          </div>

          {/* GitHub Contribution CTA - Moved to top and made prominent */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border-2 border-blue-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 rounded-xl p-3">
                <Github className="h-5 w-5 text-blue-700" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-blue-900 mb-2 text-base">
                  Want to Help Build Mobile?
                </div>
                <div className="text-blue-700 mb-3 text-sm leading-relaxed">
                  Contribute to creating a mobile experience for this project on
                  GitHub.
                </div>
                <a
                  href="https://github.com/RostyslavDzhohola/t3-clone"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors duration-200 shadow-sm"
                >
                  <Github className="h-4 w-4" />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>

          {/* Device Recommendations */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-blue-500" />
              Recommended Devices
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="bg-blue-50 rounded-lg p-2">
                  <Monitor className="h-4 w-4 text-blue-600" />
                </div>
                <span>Desktop Computer</span>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="bg-blue-50 rounded-lg p-2">
                  <Laptop className="h-4 w-4 text-blue-600" />
                </div>
                <span>Laptop Computer</span>
              </div>
            </div>
          </div>

          {/* Current Device Info */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-amber-100 rounded-lg p-2">
                <Smartphone className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-amber-800">
                  Mobile Device Detected
                </div>
                <div className="text-amber-600">
                  Switch to desktop for full functionality
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Thank you for your understanding
          </p>
        </div>
      </div>
    </div>
  );
}

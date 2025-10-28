"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-white border border-gray-200 shadow-lg",
          title: "text-gray-900 font-medium",
          description: "text-gray-500",
          actionButton: "bg-blue-600 text-white",
          cancelButton: "bg-gray-100 text-gray-900",
          closeButton: "bg-white border border-gray-200",
          error: "border-red-500 bg-red-50",
          success: "border-green-500 bg-green-50",
          warning: "border-yellow-500 bg-yellow-50",
          info: "border-blue-500 bg-blue-50",
        },
      }}
      richColors
    />
  );
}

// Re-export toast function for convenience
export { toast } from "sonner";

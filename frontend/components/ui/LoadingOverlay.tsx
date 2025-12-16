"use client";

import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
    isVisible: boolean;
    message?: string;
}

export default function LoadingOverlay({
    isVisible,
    message = "Loading...",
}: LoadingOverlayProps) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-999999999 flex items-center justify-center">
            {/* Overlay Background */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Loading Container */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                {/* Spinner */}
                <div className="relative">
                    {/* Outer Ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-white/20 blur-sm" />

                    {/* Spinning Loader */}
                    <Loader2
                        size={48}
                        className="text-cyan-400 animate-spin"
                        strokeWidth={2}
                    />
                </div>

                {/* Loading Text */}
                <div className="text-center">
                    <p className="text-white font-medium">{message}</p>
                    <p className="text-white/50 text-sm mt-1">
                        Please wait a moment...
                    </p>
                </div>
            </div>
        </div>
    );
}

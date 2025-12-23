"use client";

import { X } from "lucide-react";

export default function EmailAttachmentItem({ item, onRemove }: any) {
    return (
        <div
            className="
                flex items-center justify-between
                rounded-xl border border-white/10
                bg-white/6 backdrop-blur-lg
                px-4 py-2
                transition hover:bg-white/10
            "
        >
            {/* LEFT — File info */}
            <div className="flex flex-col min-w-0">
                <span
                    className="text-sm font-medium text-white truncate"
                    title={item.filename}
                >
                    {item.filename}
                </span>
                <span className="text-xs text-white/50">
                    {item.mimeType || "unknown"}
                </span>
            </div>

            {/* REMOVE BUTTON */}
            <button
                type="button"
                onClick={onRemove}
                className="
                    ml-3 flex items-center justify-center
                    h-7 w-7 rounded-full
                    border border-red-500/20
                    text-red-400
                    hover:bg-red-500/10 hover:text-red-300
                    transition
                "
            >
                <X size={15} />
            </button>
        </div>
    );
}

"use client";
import { X } from "lucide-react";

interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ComposeModal({ isOpen, onClose }: ComposeModalProps) {
    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        onClose();
    };

    const stop = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            onClick={handleOverlayClick}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

            {/* Accent blobs */}
            <div className="pointer-events-none absolute -top-16 -right-10 h-64 w-64 rounded-full bg-linear-to-tr from-cyan-500/25 to-purple-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-64 w-64 rounded-full bg-linear-to-tr from-sky-500/20 to-fuchsia-500/20 blur-3xl" />

            {/* Panel */}
            <div
                className="relative mx-4 w-full max-w-xl origin-center scale-100 rounded-2xl border border-white/12 bg-white/10 shadow-2xl backdrop-blur-xl transition-all"
                onClick={stop}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <h2 className="bg-linear-to-r from-cyan-300 to-purple-300 bg-clip-text text-base font-semibold text-transparent">
                        Compose Email
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close compose"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="px-5 py-4 text-white">
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs text-white/70">
                                To
                            </label>
                            <input
                                type="text"
                                placeholder="name@example.com"
                                className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm placeholder:text-white/40 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-cyan-500/50"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-white/70">
                                Subject
                            </label>
                            <input
                                type="text"
                                placeholder="Subject"
                                className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm placeholder:text-white/40 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-cyan-500/50"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-white/70">
                                Message
                            </label>
                            <textarea
                                placeholder="Write your message..."
                                className="h-40 w-full resize-y rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm leading-relaxed placeholder:text-white/40 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-cyan-500/50"
                            />
                        </div>
                    </div>

                    {/* Footer actions */}
                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/30"
                        >
                            Send
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

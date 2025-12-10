"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, BookOpen, Clock } from "lucide-react";
import type { EmailSummaryData } from "../../_types/kanban";
import { useSummarizeEmailQuery } from "../../_services";
import { useQueryHandler } from "@/hooks/useQueryHandler";

interface SummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    emailId: string;
    subject: string;
    from: string;
    date: string;
    currentSummary?: string;
}

export default function SummaryModal({
    isOpen,
    onClose,
    emailId,
    subject,
    from,
    date,
    currentSummary,
}: SummaryModalProps) {
    const [summaryData, setSummaryData] = useState<EmailSummaryData | null>(
        null
    );

    const { result, isLoading } = useQueryHandler(
        useSummarizeEmailQuery,
        { emailId },
        { skip: !isOpen || !emailId }
    );
    useEffect(() => {
        if (isOpen) {
            document
                .querySelector(".kanban__layout")
                ?.classList.add("z-99999999");
        } else {
            document
                .querySelector(".kanban__layout")
                ?.classList.remove("z-99999999");
        }
    }, [isOpen]);

    useEffect(() => {
        if (result?.data) {
            setSummaryData(result.data);
        }
    }, [result]);

    if (!isOpen) return null;

    const summary =
        summaryData?.summary || currentSummary || "No summary available";
    const keyPoints = summaryData?.keyPoints || [];
    const isCached = summaryData?.cached ?? false;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md z-50 p-4">
            <div className="relative bg-linear-to-br from-white/15 to-white/10 backdrop-blur-xl rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-white/20 shadow-2xl">
                <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-cyan-500 via-purple-500 to-cyan-500" />

                <button
                    onClick={onClose}
                    className="absolute cursor-pointer top-4 right-4 z-50 p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200 text-white/70 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="overflow-y-auto h-[85vh] px-8 py-6 space-y-6">
                    <div className="space-y-3 pb-4 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white/95 line-clamp-2  wrap-break-word">
                            {subject}
                        </h2>

                        <p className="text-sm text-white/60">
                            From: <span className="text-white/80">{from}</span>
                        </p>

                        <p className="text-xs text-white/40 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {new Date(date).toLocaleString()}
                        </p>

                        {isCached && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/20 border border-cyan-400/50 text-xs text-cyan-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                Cached Summary
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-purple-400 animate-spin" />
                                <Sparkles className="w-6 h-6 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                            </div>
                            <p className="text-white/60 text-sm">
                                Generating AI Summary...
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-cyan-400" />
                                    <h3 className="text-lg font-bold text-white/95">
                                        Summary
                                    </h3>
                                </div>
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5 hover:border-white/20 transition-all duration-200">
                                    <p className="text-white/80 leading-relaxed text-sm">
                                        {summary}
                                    </p>
                                </div>
                            </div>

                            {keyPoints.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-purple-400" />
                                        <h3 className="text-lg font-bold text-white/95">
                                            Key Points
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {keyPoints.map((point, idx) => (
                                            <div
                                                key={idx}
                                                className="group relative"
                                                style={{
                                                    animation: `slideIn 0.5s ease-out ${
                                                        idx * 0.1
                                                    }s both`,
                                                }}
                                            >
                                                <div className="absolute inset-0 rounded-xl bg-linear-to-r from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur" />
                                                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 group-hover:border-white/20 rounded-xl px-4 py-3 transition-all duration-200">
                                                    <div className="flex items-start gap-3">
                                                        <span className="shrink-0 w-6 h-6 rounded-full bg-linear-to-r from-cyan-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white mt-0.5">
                                                            {idx + 1}
                                                        </span>
                                                        <p className="text-white/80 text-sm leading-relaxed">
                                                            {point}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {keyPoints.length === 0 && !isLoading && (
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-dashed border-white/20 p-8 text-center">
                                    <p className="text-white/40 text-sm">
                                        No key points extracted from this email.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="sticky bottom-0 bg-linear-to-t from-black/20 to-transparent border-t border-white/10 px-8 py-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 cursor-pointer rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 font-medium transition-all duration-200"
                    >
                        Close
                    </button>
                </div>

                <style>{`
                    @keyframes slideIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        </div>
    );
}

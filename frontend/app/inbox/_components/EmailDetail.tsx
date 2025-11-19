// components/Inbox/EmailDetail.tsx
"use client";
import type { EmailDetailProps } from "../_types";
import {
    Reply,
    Forward,
    Trash2,
    Star,
    Paperclip,
    Download,
    File,
    ArrowLeft,
} from "lucide-react";
import { formatEmailDate } from "@/helper/dateFormatter";
import EmailBody from "./EmailBody";

interface EmailDetailWithBackProps extends EmailDetailProps {
    onBack?: () => void;
}

function formatBytes(bytes?: number) {
    if (!bytes && bytes !== 0) return "";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function displayAddress(a?: { name?: string; email?: string }) {
    if (!a) return "";
    if (a.name && a.name.trim() && a.name !== a.email)
        return `${a.name} <${a.email}>`;
    return a.email || "";
}

export default function EmailDetail({
    email,
    onBack,
}: EmailDetailWithBackProps) {
    const isHtml = !!email?.body && /<[a-z][\s\S]*>/i.test(email.body);

    return (
        <div className="flex-1 h-full flex flex-col text-white relative w-full md:w-auto">
            {!email ? (
                <div className="flex-1 flex flex-col items-center justify-center text-white/50 gap-4">
                    <div className="rounded-full bg-white/10 p-4">
                        <Forward className="text-white/50" />
                    </div>
                    <p className="text-sm">Chọn một email để xem nội dung</p>
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    {/* Mobile back button + Header */}
                    <header className="px-4 sm:px-6 py-4 sm:py-5 border-b border-white/15 flex items-start gap-3 sm:gap-0 flex-col sm:flex-col">
                        {/* Back button on mobile */}
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="md:hidden flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition mb-2"
                                aria-label="Back to email list"
                            >
                                <ArrowLeft size={16} />
                                <span>Back</span>
                            </button>
                        )}

                        <h2 className="text-lg sm:text-2xl font-bold tracking-tight mb-3 text-white break-word">
                            {email.subject}
                        </h2>

                        <div className="flex flex-col gap-1 text-xs w-full">
                            <p className="text-white/70">
                                From:{" "}
                                <span className="font-medium text-white break-all">
                                    {displayAddress(email.from)}
                                </span>
                            </p>
                            <p className="text-white/70">
                                To:{" "}
                                <span className="font-medium text-white break-all">
                                    {email.to?.map(displayAddress).join(", ")}
                                </span>
                            </p>
                            {!!email.cc?.length && (
                                <p className="text-white/70">
                                    Cc:{" "}
                                    <span className="font-medium text-white break-all">
                                        {email.cc
                                            .map(displayAddress)
                                            .join(", ")}
                                    </span>
                                </p>
                            )}
                            <p className="text-white/60 mt-1">
                                Received: {formatEmailDate(email.timestamp)}
                            </p>
                        </div>
                    </header>

                    {/* Body */}
                    <div className="custom-scroll flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm leading-relaxed space-y-4">
                        {isHtml ? (
                            <EmailBody htmlContent={email.body} />
                        ) : (
                            <pre className="whitespace-pre-wrap text-white/90 break-word">
                                {email.body}
                            </pre>
                        )}

                        {/* Attachments */}
                        {!!email.attachments?.length && (
                            <section className="mt-4">
                                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/80">
                                    <Paperclip
                                        size={16}
                                        className="text-white/70"
                                    />
                                    Attachments ({email.attachments.length})
                                </div>
                                <ul className="space-y-2">
                                    {email.attachments.map((att) => (
                                        <li
                                            key={att.id}
                                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border border-white/12 bg-white/4 px-3 py-2 gap-2 sm:gap-0"
                                        >
                                            <div className="flex min-w-0 items-center gap-3 flex-1">
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/6 ring-1 ring-white/10 shrink-0">
                                                    <File
                                                        size={16}
                                                        className="text-white/70"
                                                    />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs sm:text-sm text-white">
                                                        {att.filename}
                                                    </p>
                                                    <p className="text-[10px] sm:text-[11px] text-white/50">
                                                        {att.mimeType} •{" "}
                                                        {formatBytes(att.size)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="ml-auto sm:ml-3 flex shrink-0 items-center gap-1 sm:gap-2 w-full sm:w-auto">
                                                <a
                                                    href={att.url}
                                                    download={att.filename}
                                                    className="flex-1 sm:flex-none inline-flex items-center justify-center sm:justify-start gap-1 rounded-md bg-white/8 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-white hover:bg-white/[0.14] transition"
                                                    aria-label={`Download ${att.filename}`}
                                                >
                                                    <Download
                                                        size={12}
                                                        className="hidden sm:block"
                                                    />
                                                    Download
                                                </a>
                                                <a
                                                    href={att.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md border border-white/15 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-white/85 hover:bg-white/8 transition"
                                                >
                                                    Open
                                                </a>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* Footer actions - Responsive */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-white/15 flex flex-wrap gap-2 sm:gap-3">
                        <button className="flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg bg-white/10 px-3 sm:px-4 py-2 text-xs font-medium text-white hover:bg-white/20 transition">
                            <Reply size={14} className="sm:size-4" />{" "}
                            <span className="hidden sm:inline">Reply</span>
                        </button>
                        <button className="flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg bg-white/10 px-3 sm:px-4 py-2 text-xs font-medium text-white hover:bg-white/20 transition">
                            <Forward size={14} className="sm:size-4" />{" "}
                            <span className="hidden sm:inline">Forward</span>
                        </button>
                        <button className="flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg bg-white/10 px-3 sm:px-4 py-2 text-xs font-medium text-white hover:bg-red-600/20 transition">
                            <Trash2 size={14} className="sm:size-4" />{" "}
                            <span className="hidden sm:inline">Delete</span>
                        </button>
                        <button className="flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg bg-white/10 px-3 sm:px-4 py-2 text-xs font-medium text-white hover:bg-yellow-500/20 transition">
                            <Star size={14} className="sm:size-4" />{" "}
                            <span className="hidden sm:inline">Star</span>
                        </button>
                    </div>

                    {/* Unread badge */}
                    {!email.isRead && (
                        <span className="absolute top-4 right-4 sm:right-6 rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] font-medium text-cyan-300 ring-1 ring-cyan-300/30">
                            Chưa đọc
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// components/Inbox/EmailDetail.tsx
"use client";
import type { EmailDetailProps, Email } from "../_types";
import {
    Reply,
    Forward,
    Trash2,
    Star,
    Paperclip,
    Download,
    File,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { formatEmailDate } from "@/helper/dateFormatter";
import EmailBody from "./EmailBody";
import { useTranslation } from "react-i18next";
import { AppConfig } from "@/config";
import SERVICES from "@/constants/services";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useReplyEmailMutation, useGetThreadEmailsQuery } from "../_services";
import ReplyModal from "./ReplyModal";
import { useState, useEffect } from "react";
import clsx from "clsx";

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

const SingleEmailView = ({
    email,
    isExpanded,
    onToggle,
    isLast,
}: {
    email: Email;
    isExpanded: boolean;
    onToggle: () => void;
    isLast: boolean;
}) => {
    const { t } = useTranslation();
    const isHtml = !!email?.body && /<[a-z][\s\S]*>/i.test(email.body);
    const [isReplyOpen, setIsReplyOpen] = useState(false);

    const handleDownloadAttachment = async (url: string, filename: string) => {
        try {
            const token = localStorage.getItem(SERVICES.accessToken);
            const response = await fetch(`${AppConfig.apiBaseUrl}${url}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to download attachment");
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error downloading attachment:", error);
            alert("Failed to download attachment");
        }
    };

    const handleViewAttachment = async (
        url: string,
        filename: string,
        mimeType: string
    ) => {
        try {
            const token = localStorage.getItem(SERVICES.accessToken);
            const response = await fetch(`${AppConfig.apiBaseUrl}${url}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to load attachment");
            }

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            window.open(blobUrl, "_blank");

            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 100);
        } catch (error) {
            console.error("Error viewing attachment:", error);
            alert("Failed to view attachment");
        }
    };

    return (
        <div className={clsx("border-b border-white/10 last:border-0", isExpanded ? "bg-white/5" : "bg-transparent")}>
            <div
                className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-white/5 transition"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm text-white truncate">
                            {email.from?.name || email.from?.email}
                        </span>
                        <span className="text-xs text-white/60 truncate">
                            {isExpanded ? displayAddress(email.from) : email.preview}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-white/50">
                        {formatEmailDate(email.timestamp)}
                    </span>
                    {(email.attachments?.length || 0) > 0 && (
                        <Paperclip size={14} className="text-white/50" />
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="px-4 pb-4">
                    <div className="text-xs text-white/70 mb-4">
                        to {email.to?.map((t) => t.name || t.email).join(", ")}
                    </div>
                    
                    <div className="text-sm text-white/90 leading-relaxed mb-4 overflow-hidden">
                         {isHtml ? (
                            <EmailBody htmlContent={email.body} />
                        ) : (
                            <pre className="whitespace-pre-wrap font-sans">
                                {email.body}
                            </pre>
                        )}
                    </div>

                    {/* Attachments */}
                    {!!email.attachments?.length && (
                        <div className="mb-4">
                            <div className="flex flex-wrap gap-2">
                                {email.attachments?.map((att) => (
                                    <div
                                        key={att.id}
                                        className="flex items-center gap-2 bg-white/10 rounded px-2 py-1 text-xs"
                                    >
                                        <File size={12} className="text-white/70" />
                                        <span className="truncate max-w-[150px]">{att.filename}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadAttachment(att.url, att.filename);
                                            }}
                                            className="hover:text-cyan-400"
                                        >
                                            <Download size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsReplyOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs font-medium transition"
                        >
                            <Reply size={14} /> {t("inbox.detail.5")}
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs font-medium transition">
                            <Forward size={14} /> {t("inbox.detail.6")}
                        </button>
                    </div>
                </div>
            )}
             <ReplyModal
                isOpen={isReplyOpen}
                onClose={() => setIsReplyOpen(false)}
                email={email}
            />
        </div>
    );
};

export default function EmailDetail({
    email,
    onBack,
}: EmailDetailWithBackProps) {
    const { t } = useTranslation();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    
    // If email has threadEmails, fetch them. Otherwise just use the single email.
    // Note: We need a way to know if we should fetch the thread. 
    // For now, if threadCount > 1, we try to fetch.
    const shouldFetchThread = email?.threadCount && email.threadCount > 1;
    
    const { data: threadData, isLoading: isThreadLoading } = useGetThreadEmailsQuery(
        { id: email?.id || "", mailbox: email?.mailboxId },
        { skip: !shouldFetchThread }
    );

    const emailsToRender = shouldFetchThread && threadData?.data 
        ? threadData.data 
        : (email ? [email] : []);

    // Sort chronologically
    const sortedEmails = [...emailsToRender].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    useEffect(() => {
        if (sortedEmails.length > 0) {
            // Expand the last email by default
            const lastEmail = sortedEmails[sortedEmails.length - 1];
            setExpandedIds(new Set([lastEmail.id]));
        }
    }, [sortedEmails.length, email?.id]);

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedIds(newSet);
    };

    if (!email) {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center text-white/50 gap-4">
                <div className="rounded-full bg-white/10 p-4">
                    <Forward className="text-white/50" />
                </div>
                <p className="text-sm">{t("inbox.9")}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full flex flex-col text-white relative w-full md:w-auto bg-[#1E1E1E]">
            {/* Header */}
            <header className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="md:hidden text-white/70 hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <h2 className="text-xl font-semibold text-white truncate flex-1">
                    {email.subject}
                </h2>
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white/10 rounded-full transition text-white/70">
                        <Trash2 size={18} />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition text-white/70">
                        <Star size={18} />
                    </button>
                </div>
            </header>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto custom-scroll">
                {isThreadLoading ? (
                    <div className="p-8 text-center text-white/50">Loading thread...</div>
                ) : (
                    <div className="flex flex-col pb-4">
                        {sortedEmails.map((e, index) => (
                            <SingleEmailView
                                key={e.id}
                                email={e}
                                isExpanded={expandedIds.has(e.id)}
                                onToggle={() => toggleExpand(e.id)}
                                isLast={index === sortedEmails.length - 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

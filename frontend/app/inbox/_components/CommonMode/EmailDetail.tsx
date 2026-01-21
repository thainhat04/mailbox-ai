// components/Inbox/EmailDetail.tsx
"use client";
import type { Email, PreviewEmail } from "../../_types";
import {
    Reply,
    Forward,
    Trash2,
    Star,
    Paperclip,
    Download,
    File,
    ArrowLeft,
    ExternalLink,
} from "lucide-react";
import { formatEmailDate } from "@/helper/dateFormatter";
import EmailBody from "./EmailBody";
import { useTranslation } from "react-i18next";
import { AppConfig } from "@/config";
import SERVICES from "@/constants/services";
import ReplyModal from "./ReplyModal";
import ForwardModal from "./ForwardModal";
import { useState, useEffect } from "react";
import { useModifyEmailMutation, useGetEmailByIdQuery } from "../../_services";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { useToast } from "@/components/ui/toast-provider";
import { useSelector } from "@/store";

interface EmailDetailWithBackProps {
    previewEmail: PreviewEmail | null;
    onBack?: () => void;
    setPreviewEmail: (email: PreviewEmail | null) => void;
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
    previewEmail,
    onBack,
    setPreviewEmail,
}: EmailDetailWithBackProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [isReplyOpen, setIsReplyOpen] = useState(false);
    const [isForwardOpen, setIsForwardOpen] = useState(false);
    const [isStarred, setIsStarred] = useState(false);
    const [email, setEmail] = useState<Email | null>(null);
    const { result, isFetching, error } = useQueryHandler(
        useGetEmailByIdQuery,
        {
            id: previewEmail?.id || "",
        },
        {
            skip: !previewEmail?.id,
        },
    );
    const token = useSelector((state) => state.auth.accessToken);
    const isHtml = !!email?.body && /<[a-z][\s\S]*>/i.test(email.body);
    const modifyEmail = useMutationHandler(
        useModifyEmailMutation,
        "ModifyEmail",
    );

    useEffect(() => {
        if (result) {
            setEmail(result.data);
            setIsStarred(result.data.isStarred);
        }
    }, [result]);

    useEffect(() => {
        if (error) {
            showToast(t("inbox.emailLoadError"), "error");
        }
    }, [error]);

    const handleDownloadAttachment = async (url: string, filename: string) => {
        try {
            url = url.replace("/api/v1/", "/");
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
        mimeType: string,
    ) => {
        try {
            url = url.replace("/api/v1/", "/");
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

            // Clean up after a delay to allow the browser to load it
            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 100);
        } catch (error) {
            console.error("Error viewing attachment:", error);
            alert("Failed to view attachment");
        }
    };
    const handleDelete = async () => {
        if (!email?.id) return;
        if (modifyEmail.isLoading) return;
        const result = await modifyEmail.ModifyEmail({
            emailId: email.id,
            mailBox: email.labelId,
            flags: { delete: true },
        });
        if (result) {
            if (onBack) {
                onBack();
            }
            setPreviewEmail(null);
            setEmail(null);
        } else {
            showToast(t("inbox.emailDeleteError"), "error");
        }
    };
    const handleStar = async () => {
        if (!email?.id) return;
        if (modifyEmail.isLoading) return;

        // Optimistic update
        const newStarred = !isStarred;

        const result = await modifyEmail.ModifyEmail({
            emailId: email.id,
            mailBox: email.labelId,
            flags: { starred: newStarred },
        });

        if (!result) {
            showToast(t("inbox.emailStarError"), "error");
        }
    };

    const handleOpenInGmail = () => {
        if (!email?.messageId) {
            return;
        }

        const gmailUrl = `https://mail.google.com/mail/u/0/#all/${email.messageId}`;
        window.open(gmailUrl, "_blank");
    };

    return (
        <div className="flex-1 h-full flex flex-col text-white relative w-auto">
            {!email ? (
                <div className="flex-1 flex flex-col items-center justify-center text-white/50 gap-4">
                    {!isFetching ? (
                        <>
                            <div className="rounded-full bg-white/10 p-4">
                                <Forward className="text-white/50" />
                            </div>
                            <p className="text-sm">{t("inbox.9")}</p>
                        </>
                    ) : (
                        <LoadingOverlay isVisible={isFetching} />
                    )}
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    {/* Mobile back button + Header */}
                    <LoadingOverlay isVisible={isFetching} />
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
                                {t("inbox.detail.1")}:{" "}
                                <span className="font-medium text-white break-all">
                                    {displayAddress(email.from)}
                                </span>
                            </p>
                            <p className="text-white/70">
                                {t("inbox.detail.2")}:{" "}
                                <span className="font-medium text-white break-all">
                                    {email.to?.map(displayAddress).join(", ")}
                                </span>
                            </p>
                            {!!email.cc?.length && (
                                <p className="text-white/70">
                                    {t("inbox.detail.3")}:{" "}
                                    <span className="font-medium text-white break-all">
                                        {email.cc
                                            .map(displayAddress)
                                            .join(", ")}
                                    </span>
                                </p>
                            )}
                            <p className="text-white/60 mt-1">
                                {t("inbox.detail.4")}:{" "}
                                {formatEmailDate(email.timestamp)}
                            </p>
                        </div>
                    </header>

                    {/* Body */}
                    <div className="custom-scroll flex-1 flex flex-col overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm leading-relaxed space-y-4">
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
                                    {t("inbox.detail.9")} (
                                    {email.attachments.length})
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
                                                    <div className="relative group">
                                                        <p className="truncate text-xs sm:text-sm text-white">
                                                            {att.filename}
                                                        </p>
                                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                                                            <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-xs wrap-break-word ">
                                                                {att.filename}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] sm:text-[11px] text-white/50">
                                                        {att.mimeType} •{" "}
                                                        {formatBytes(att.size)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="ml-auto sm:ml-3 flex shrink-0 items-center gap-1 sm:gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={() =>
                                                        handleDownloadAttachment(
                                                            att.url,
                                                            att.filename,
                                                        )
                                                    }
                                                    className="flex-1 cursor-pointer sm:flex-none inline-flex items-center justify-center sm:justify-start gap-1 rounded-md bg-white/8 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-white hover:bg-white/[0.14] transition"
                                                    aria-label={`Download ${att.filename}`}
                                                >
                                                    <Download
                                                        size={12}
                                                        className="hidden sm:block"
                                                    />
                                                    {t("inbox.detail.10")}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleViewAttachment(
                                                            att.url,
                                                            att.filename,
                                                            att.mimeType,
                                                        )
                                                    }
                                                    className="flex-1 cursor-pointer sm:flex-none inline-flex items-center justify-center rounded-md border border-white/15 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-white/85 hover:bg-white/8 transition"
                                                >
                                                    {t("inbox.detail.11")}
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* Footer actions - Responsive */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-white/15 flex flex-wrap gap-2 sm:gap-3">
                        <button
                            onClick={() => setIsReplyOpen(true)}
                            className="flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg bg-white/10 px-3 sm:px-4 py-2 text-xs font-medium text-white hover:bg-white/20 transition"
                        >
                            <Reply size={14} className="sm:size-4" />{" "}
                            <span className="hidden sm:inline">
                                {t("inbox.detail.5")}
                            </span>
                        </button>
                        <button
                            onClick={() => setIsForwardOpen(true)}
                            className="flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg bg-white/10 px-3 sm:px-4 py-2 text-xs font-medium text-white hover:bg-white/20 transition"
                        >
                            <Forward size={14} className="sm:size-4" />{" "}
                            <span className="hidden sm:inline">
                                {t("inbox.detail.6")}
                            </span>
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg bg-white/10 px-3 sm:px-4 py-2 text-xs font-medium text-white hover:bg-red-600/20 transition"
                        >
                            <Trash2 size={14} className="sm:size-4" />{" "}
                            <span className="hidden sm:inline">
                                {t("inbox.detail.7")}
                            </span>
                        </button>
                        <button
                            onClick={handleStar}
                            className={`flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs font-medium transition ${
                                isStarred
                                    ? "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                                    : "bg-white/10 text-white hover:bg-white/[0.14]"
                            }`}
                            aria-pressed={isStarred}
                            disabled={modifyEmail.isLoading}
                        >
                            <Star
                                size={14}
                                className={
                                    isStarred ? "text-yellow-300" : "text-white"
                                }
                            />
                            <span className="hidden sm:inline">
                                {t("inbox.detail.8")}
                            </span>
                        </button>
                        <button
                            onClick={handleOpenInGmail}
                            className="flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg bg-white/10 px-3 sm:px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.14] transition"
                            disabled={!email?.messageId}
                        >
                            <ExternalLink size={14} className="sm:size-4" />
                            <span className="hidden sm:inline">
                                {t("inbox.detail.14")}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* Reply Modal */}
            <ReplyModal
                isOpen={isReplyOpen}
                onClose={() => setIsReplyOpen(false)}
                email={email}
            />

            {/* Forward Modal */}
            <ForwardModal
                isOpen={isForwardOpen}
                onClose={() => setIsForwardOpen(false)}
                email={email}
            />
            {modifyEmail.isLoading && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-wait"
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex flex-col items-center gap-2">
                        <span className="inline-block h-10 w-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                        <span className="text-sm text-white/90">
                            {t("inbox.detail.13")}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { X, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useReplyEmail } from "../../hooks/useReplyEmail";
import EmailAttachmentItem from "./EmailAttachmentItem";
import { useReplyEmailMutation } from "../../_services";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useEffect } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { Email } from "../../_types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    email: Email | null;
}

export default function ReplyModal({ isOpen, onClose, email }: Props) {
    const { ReplyEmail, isLoading, error, result } = useMutationHandler(
        useReplyEmailMutation,
        "ReplyEmail"
    );
    const { showToast } = useToast();
    const { t } = useTranslation();

    const {
        replyText,
        setReplyText,
        attachments,
        handleFileUpload,
        removeAttachment,
        buildBody,
        errors,
        reset,
    } = useReplyEmail(email);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        onClose();
    };

    const stop = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const replyData = buildBody();
        if (!replyData || !email?.id) return;

        // Build the complete request body with emailId
        const requestBody = {
            emailId: email.id,
            replyData,
        };

        ReplyEmail(requestBody);
    };

    useEffect(() => {
        if (error) {
            showToast(
                t("inbox.compose.emailSendError", {
                    error: error.message,
                }),
                "error"
            );
        }
    }, [error]);

    useEffect(() => {
        if (result) {
            showToast(t("inbox.compose.emailSent"), "success");
            reset();
            onClose();
        }
    }, [result]);
    useEffect(() => {
        if (isOpen) {
            document
                .querySelector(".backdrop__need")
                ?.classList.remove("backdrop-blur-2xl");
        } else {
            document
                .querySelector(".backdrop__need")
                ?.classList.add("backdrop-blur-2xl");
        }
    }, [isOpen]);
    if (!isOpen || !email) return null;
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
                className="relative mx-4 w-full max-w-xl origin-center rounded-2xl border border-white/12 bg-white/10 shadow-2xl backdrop-blur-xl overflow-auto custom-scroll max-h-[90vh]"
                onClick={stop}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div className="flex-1">
                        <h2 className="bg-linear-to-r from-cyan-300 to-purple-300 bg-clip-text text-base font-semibold text-transparent">
                            {t("inbox.reply.1") || "Reply to Email"}
                        </h2>
                        <p className="text-xs text-white/50 mt-1 truncate">
                            {t("inbox.reply.2") || "To"}:{" "}
                            {email.from?.email || "Unknown"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex cursor-pointer h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70 hover:bg-white/10 hover:text-white transition shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Original Email Preview */}
                <div className="px-5 py-3 border-b border-white/10 bg-white/5">
                    <p className="text-xs font-medium text-white/70 mb-1">
                        {t("inbox.reply.3") || "Original Message"}:
                    </p>
                    <div className="rounded-lg border border-white/10 bg-white/3 p-3">
                        <p className="text-xs text-white/80 font-medium mb-1">
                            {email.subject}
                        </p>
                    </div>
                </div>

                {/* BODY */}
                <form
                    onSubmit={handleSend}
                    className="px-5 py-4 text-white space-y-3"
                >
                    {/* MESSAGE */}
                    <div>
                        <label className="mb-1 block text-xs text-white/70">
                            {t("inbox.compose.4") || "Message"}
                        </label>
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={
                                t("inbox.compose.9") || "Write your reply..."
                            }
                            className="h-32 w-full resize-y rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm leading-relaxed placeholder:text-white/40 outline-none focus:border-white/20 focus:ring-2 focus:ring-cyan-500/50"
                        />
                        {errors.replyText && (
                            <p className="text-xs text-red-400 mt-1">
                                {errors.replyText}
                            </p>
                        )}
                    </div>

                    {/* FILE UPLOAD */}
                    <div className="pt-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-white mb-1">
                            <Paperclip size={15} />
                            {t("inbox.compose.10") || "Attachments"}
                        </label>

                        <label className="flex items-center justify-center w-full px-4 py-2 border border-white/20 border-dashed rounded-lg cursor-pointer hover:bg-white/5 transition">
                            <span className="text-xs text-white/80">
                                {t("inbox.compose.10") || "Choose file…"}
                            </span>
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) =>
                                    handleFileUpload(e.target.files)
                                }
                            />
                        </label>
                    </div>

                    {/* ATTACHMENT LIST */}
                    {attachments.length > 0 && (
                        <div className="space-y-2">
                            {attachments.map((att, i) => (
                                <EmailAttachmentItem
                                    key={i}
                                    item={att}
                                    onRemove={() => removeAttachment(i)}
                                />
                            ))}
                        </div>
                    )}

                    {/* FOOTER BUTTONS */}
                    <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl cursor-pointer border border-white/15 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition"
                        >
                            {t("inbox.compose.6") || "Cancel"}
                        </button>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                                isLoading
                                    ? "bg-white/10 cursor-not-allowed opacity-60"
                                    : "bg-linear-to-r from-cyan-500 to-sky-500 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 cursor-pointer"
                            }`}
                        >
                            {isLoading
                                ? `${t("inbox.reply.4") || "Sending"}...`
                                : t("inbox.reply.4") || "Send Reply"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

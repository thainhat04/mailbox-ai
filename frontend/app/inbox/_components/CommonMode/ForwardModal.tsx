"use client";

import { X, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useForwardEmail } from "../../_hooks/useForwardEmail";
import EmailAttachmentItem from "./EmailAttachmentItem";
import { useSendEmailMutation } from "../../_services";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { use, useEffect } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { Email } from "../../_types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    email: Email | null;
}

export default function ForwardModal({ isOpen, onClose, email }: Props) {
    const sendEmailMutation = useMutationHandler(
        useSendEmailMutation,
        "SendEmail"
    );
    const { showToast } = useToast();
    const { t } = useTranslation();

    const {
        to,
        setTo,
        cc,
        setCc,
        bcc,
        setBcc,
        subject,
        setSubject,
        message,
        setMessage,
        attachments,
        handleFileUpload,
        removeAttachment,
        buildBody,
        errors,
        reset,
    } = useForwardEmail(email);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        onClose();
    };

    const stop = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const body = buildBody();
        if (!body) return;
        sendEmailMutation.SendEmail(body);
    };

    useEffect(() => {
        if (sendEmailMutation.error) {
            showToast(
                t("inbox.compose.emailSendError", {
                    error: sendEmailMutation.error.message,
                }),
                "error"
            );
        }
    }, [sendEmailMutation.error]);

    useEffect(() => {
        if (sendEmailMutation.result) {
            showToast(t("inbox.compose.emailSent"), "success");
            reset();
            onClose();
        }
    }, [sendEmailMutation.result]);
    useEffect(() => {
        const item = document.querySelector(".email_detail") as HTMLElement;

        const header_inbox = document.querySelector(
            ".header_inbox"
        ) as HTMLElement;
        if (isOpen) {
            document
                .querySelector(".backdrop__need")
                ?.classList.remove("backdrop-blur-2xl");

            if (header_inbox) {
                header_inbox.style.zIndex = "1";
            }
            if (item) {
                item.style.overflow = "hidden";
                //scroll to top
                item.scrollTop = 0;
            }
        } else {
            document
                .querySelector(".backdrop__need")
                ?.classList.add("backdrop-blur-2xl");

            if (header_inbox) {
                header_inbox.style.zIndex = "100";
            }
            if (item) {
                item.style.overflow = "visible";
            }
        }
    }, [isOpen]);
    if (!isOpen || !email) return null;

    return (
        <div
            className="fixed inset-0 z-99999 flex items-center justify-center"
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
                style={{
                    maxHeight: "90%",
                }}
                className="relative mx-4 w-full max-w-xl origin-center rounded-2xl border border-white/12 bg-white/10 shadow-2xl backdrop-blur-xl overflow-auto custom-scroll max-h-[90vh]"
                onClick={stop}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <h2 className="bg-linear-to-r from-cyan-300 to-purple-300 bg-clip-text text-base font-semibold text-transparent">
                        Forward Email
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex cursor-pointer h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70 hover:bg-white/10 hover:text-white transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* BODY */}
                <form
                    onSubmit={handleSend}
                    className="px-5 py-4 text-white space-y-3"
                >
                    {/* TO */}
                    <div>
                        <label className="mb-1 block text-xs text-white/70">
                            {t("inbox.compose.2")}
                        </label>
                        <input
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder={t("inbox.compose.7")!}
                            className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-cyan-500/50"
                        />
                        {errors.to && (
                            <p className="text-xs text-red-400 mt-1">
                                {errors.to}
                            </p>
                        )}
                    </div>

                    {/* CC */}
                    <div>
                        <label className="mb-1 block text-xs text-white/70">
                            CC
                        </label>
                        <input
                            value={cc.join(",")}
                            onChange={(e) =>
                                setCc(
                                    e.target.value
                                        .split(",")
                                        .map((s) => s.trim())
                                )
                            }
                            placeholder="example1@gmail.com, example2@gmail.com"
                            className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-cyan-500/50"
                        />
                        {errors.cc && (
                            <p className="text-xs text-red-400 mt-1">
                                {errors.cc}
                            </p>
                        )}
                    </div>

                    {/* BCC */}
                    <div>
                        <label className="mb-1 block text-xs text-white/70">
                            BCC
                        </label>
                        <input
                            value={bcc.join(",")}
                            onChange={(e) =>
                                setBcc(
                                    e.target.value
                                        .split(",")
                                        .map((s) => s.trim())
                                )
                            }
                            placeholder="example1@gmail.com, example2@gmail.com"
                            className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-cyan-500/50"
                        />
                        {errors.bcc && (
                            <p className="text-xs text-red-400 mt-1">
                                {errors.bcc}
                            </p>
                        )}
                    </div>

                    {/* SUBJECT */}
                    <div>
                        <label className="mb-1 block text-xs text-white/70">
                            {t("inbox.compose.3")}
                        </label>
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder={t("inbox.compose.8")!}
                            className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm placeholder:text-white/40 outline-none focus:border-white/20 focus:ring-2 focus:ring-cyan-500/50"
                        />
                        {errors.subject && (
                            <p className="text-xs text-red-400 mt-1">
                                {errors.subject}
                            </p>
                        )}
                    </div>

                    {/* MESSAGE */}
                    <div>
                        <label className="mb-1 block text-xs text-white/70">
                            {t("inbox.compose.4")}
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={t("inbox.compose.9")!}
                            className="h-60 w-full resize-y rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm leading-relaxed placeholder:text-white/40 outline-none focus:border-white/20 focus:ring-2 focus:ring-cyan-500/50"
                        />
                        {errors.message && (
                            <p className="text-xs text-red-400 mt-1">
                                {errors.message}
                            </p>
                        )}
                    </div>

                    {/* FILE UPLOAD */}
                    <div className="pt-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-white mb-1">
                            <Paperclip size={15} />
                            {t("inbox.compose.10")}
                        </label>

                        <label className="flex items-center justify-center w-full px-4 py-2 border border-white/20 border-dashed rounded-lg cursor-pointer hover:bg-white/5 transition">
                            <span className="text-xs text-white/80">
                                Chọn tập tin…
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
                            {t("inbox.compose.6")}
                        </button>

                        <button
                            type="submit"
                            disabled={sendEmailMutation.isLoading}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                                sendEmailMutation.isLoading
                                    ? "bg-white/10 cursor-not-allowed opacity-60"
                                    : "bg-linear-to-r from-cyan-500 to-sky-500 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 cursor-pointer"
                            }`}
                        >
                            {sendEmailMutation.isLoading
                                ? `${t("inbox.compose.5")}...`
                                : t("inbox.compose.5")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

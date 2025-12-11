"use client";

import { useState } from "react";
import { AttachmentDto, ReplyEmail } from "../_types/compose";
import constant from "../_constants";
import { useToast } from "@/components/ui/toast-provider";
import { useTranslation } from "react-i18next";
import { Email } from "../_types";

const MAX_FILE_SIZE = constant.FILE_MAX_SIZE_MB * 1024 * 1024;

interface UseReplyEmailReturn {
    replyText: string;
    setReplyText: (text: string) => void;
    attachments: AttachmentDto[];
    errors: {
        replyText?: string;
    };
    handleFileUpload: (files: FileList | null) => Promise<void>;
    removeAttachment: (index: number) => void;
    buildBody: () => ReplyEmail | null;
    reset: () => void;
}

export function useReplyEmail(email: Email | null): UseReplyEmailReturn {
    const { t } = useTranslation();
    const [replyText, setReplyText] = useState("");
    const [attachments, setAttachments] = useState<AttachmentDto[]>([]);
    const [errors, setErrors] = useState<{
        replyText?: string;
    }>({});

    const { showToast } = useToast();

    const handleFileUpload = async (files: FileList | null) => {
        if (!files) return;

        const result: AttachmentDto[] = [];

        for (const file of Array.from(files)) {
            if (file.size > MAX_FILE_SIZE) {
                showToast(
                    t("inbox.compose.fileTooLarge", {
                        name: file.name,
                        size: constant.FILE_MAX_SIZE_MB,
                    }),
                    "error"
                );
                continue;
            }

            const base64 = await fileToBase64(file);
            result.push({
                filename: file.name,
                mimeType: file.type,
                contentBase64: base64.replace(/^data:.+;base64,/, ""),
            });
        }

        if (result.length > 0) {
            setAttachments((prev) => [...prev, ...result]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const buildBody = (): ReplyEmail | null => {
        const newErrors: typeof errors = {};

        if (!replyText.trim())
            newErrors.replyText = t("inbox.compose.errors.messageRequired");

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return null;

        if (!email) return null;

        return {
            replyText: replyText.trim(),
            replyHtml: undefined,
            includeQuoted: true,
            attachments: attachments.length > 0 ? attachments : undefined,
            mailBox: email.labelId[0] || "inbox",
        };
    };

    const reset = () => {
        setReplyText("");
        setAttachments([]);
        setErrors({});
    };

    return {
        replyText,
        setReplyText,
        attachments,
        errors,
        handleFileUpload,
        removeAttachment,
        buildBody,
        reset,
    };
}

async function fileToBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

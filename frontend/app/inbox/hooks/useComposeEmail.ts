"use client";

import { useState } from "react";
import { SendEmailDto, AttachmentDto } from "../_types/compose";
import constant from "../_constants";
import { useToast } from "@/components/ui/toast-provider";
import { useTranslation } from "react-i18next";

const MAX_FILE_SIZE = constant.FILE_MAX_SIZE_MB * 1024 * 1024;

export function useComposeEmail() {
    const { t } = useTranslation();
    const [to, setTo] = useState("");
    const [cc, setCc] = useState<string[]>([]);
    const [bcc, setBcc] = useState<string[]>([]);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [attachments, setAttachments] = useState<AttachmentDto[]>([]);
    const [errors, setErrors] = useState<{
        to?: string;
        cc?: string;
        bcc?: string;
        subject?: string;
        message?: string;
    }>({});

    const { showToast } = useToast();

    const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validateEmails = (emails: string[]) =>
        emails.every((e) => e.trim() === "" || isValidEmail(e.trim()));

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

    const buildBody = (): SendEmailDto | null => {
        const newErrors: typeof errors = {};

        if (to.length === 0)
            newErrors.to = t("inbox.compose.errors.toRequired");
        else if (!validateEmails([to]))
            newErrors.to = t("inbox.compose.errors.toInvalid");

        if (!validateEmails(cc))
            newErrors.cc = t("inbox.compose.errors.ccInvalid");
        if (!validateEmails(bcc))
            newErrors.bcc = t("inbox.compose.errors.bccInvalid");

        if (!subject.trim())
            newErrors.subject = t("inbox.compose.errors.subjectRequired");
        if (!message.trim())
            newErrors.message = t("inbox.compose.errors.messageRequired");

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return null;

        return { to, cc, bcc, subject, text: message, attachments };
    };

    return {
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
        errors,

        handleFileUpload,
        removeAttachment,
        buildBody,
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

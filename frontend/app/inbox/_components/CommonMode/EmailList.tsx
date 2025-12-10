"use client";

import { useEffect, useState, useRef } from "react";
import type { Email, PreviewEmail } from "../../_types";
import EmailRow from "./EmailRow";
import EmailToolbar from "./EmailToolbar";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import {
    useGetMailInOneBoxQuery,
    useModifyEmailMutation,
} from "../../_services";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/toast-provider";

interface PreviewEmailListProps {
    selectedFolder: string;
    selectedPreviewEmail: PreviewEmail | null;
    onSelectPreviewEmail: (previewEmail: PreviewEmail | null) => void;
    isComposeOpen: boolean;
    setIsComposeOpen: (open: boolean) => void;
}

export default function EmailList({
    selectedFolder,
    selectedPreviewEmail,
    onSelectPreviewEmail,
    isComposeOpen,
    setIsComposeOpen,
}: PreviewEmailListProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();

    const limit = 20;

    // -------- PAGINATION STATES --------
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // -------- EMAIL STATES --------
    const [previewEmails, setPreviewEmails] = useState<PreviewEmail[]>([]);
    const [selectedPreviewEmails, setSelectedPreviewEmails] = useState<
        Set<string>
    >(new Set());
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const emailListRef = useRef<HTMLDivElement>(null);

    const { result, isLoading, isFetching, refetch } = useQueryHandler(
        useGetMailInOneBoxQuery,
        { mailboxId: selectedFolder, page, limit },
        { skip: !selectedFolder }
    );

    const modifyEmail = useMutationHandler(
        useModifyEmailMutation,
        "ModifyEmail"
    );

    // Reset khi đổi folder
    useEffect(() => {
        setPage(1);
        setTotalPages(1);
        setPreviewEmails([]);
        setSelectedPreviewEmails(new Set());
        setFocusedIndex(-1);
    }, [selectedFolder]);

    // Khi có data
    useEffect(() => {
        if (!result?.data) return;
        setPreviewEmails(result.data.emails);
        setTotalPages(result.data.totalPages);
        // Clean up selected IDs
        setSelectedPreviewEmails((prev) => {
            const newSet = new Set<string>();
            prev.forEach((id) => {
                if (result.data.emails.some((e: PreviewEmail) => e.id === id)) {
                    newSet.add(id);
                }
            });
            return newSet;
        });
    }, [result]);

    // --------- KEYBOARD NAVIGATION ----------
    useKeyboardNavigation({
        onArrowUp: () => {
            if (previewEmails.length === 0) return;
            setFocusedIndex((prev) =>
                prev <= 0 ? previewEmails.length - 1 : prev - 1
            );
        },
        onArrowDown: () => {
            if (previewEmails.length === 0) return;
            setFocusedIndex((prev) =>
                prev === -1
                    ? 0
                    : prev >= previewEmails.length - 1
                    ? 0
                    : prev + 1
            );
        },
        onEnter: () => {
            if (focusedIndex >= 0) {
                onSelectPreviewEmail(previewEmails[focusedIndex]);
            }
        },
        enabled: !isComposeOpen,
    });

    // Scroll khi focus
    useEffect(() => {
        if (focusedIndex >= 0) {
            const items =
                emailListRef.current?.querySelectorAll("[data-email-row]");
            const row = items?.[focusedIndex] as HTMLElement;
            row?.scrollIntoView({ behavior: "auto", block: "nearest" });
        }
    }, [focusedIndex]);

    // --------- ACTIONS ----------
    const toggleSelectPreviewEmail = (id: string) => {
        setSelectedPreviewEmails((prev) => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    const handleSelectPreviewEmail = (previewEmail: PreviewEmail) => {
        onSelectPreviewEmail(previewEmail);
        const idx = previewEmails.findIndex((e) => e.id === previewEmail.id);
        setFocusedIndex(idx);
    };

    const refreshEmails = () => {
        refetch();
    };

    const selectAll = () => {
        setSelectedPreviewEmails(new Set(previewEmails.map((e) => e.id)));
    };

    const deleteSelected = async () => {
        const ids = Array.from(selectedPreviewEmails);
        if (!ids.length) return;

        await Promise.all(
            ids.map(async (emailId) => {
                const res = await modifyEmail.ModifyEmail({
                    emailId,
                    mailBox:
                        previewEmails.find((e) => e.id === emailId)?.labelId ||
                        [],
                    flags: { delete: true },
                });
                return { emailId, ok: !!res };
            })
        );
        setSelectedPreviewEmails(new Set());
    };

    const markSelected = async (read: boolean) => {
        const ids = Array.from(selectedPreviewEmails);
        if (!ids.length) return;

        await Promise.all(
            ids.map((id) =>
                modifyEmail.ModifyEmail({
                    emailId: id,
                    mailBox:
                        previewEmails.find((e) => e.id === id)?.labelId || [],
                    flags: { read },
                })
            )
        );

        // setPreviewEmails((prev) =>
        //     prev.map((e) => (ids.includes(e.id) ? { ...e, isRead: read } : e))
        // );

        setSelectedPreviewEmails(new Set());
    };

    const toggleStar = async (id: string) => {
        const email = previewEmails.find((e) => e.id === id);
        if (!email) return;

        const result = await modifyEmail.ModifyEmail({
            emailId: id,
            mailBox: previewEmails.find((e) => e.id === id)?.labelId || [],
            flags: { starred: !email.isStarred },
        });

        if (!result) return showToast(t("inbox.emailStarError"), "error");
    };

    const toggleRead = async (id: string) => {
        const email = previewEmails.find((e) => e.id === id);
        if (!email) return;
        console.log("Toggling read for", id, "current isRead:", email.isRead);
        if (email.isRead) return;

        const result = await modifyEmail.ModifyEmail({
            emailId: id,
            mailBox: previewEmails.find((e) => e.id === id)?.labelId || [],
            flags: { read: true },
        });

        if (!result) return showToast(t("inbox.emailMarkError"), "error");
    };

    // -------- PAGINATION NAVIGATION --------
    const Pagination = () => (
        <div className="flex justify-between items-center p-2 text-sm text-white/70 border-t border-white/10">
            <button
                disabled={page <= 1}
                className="px-3 cursor-pointer py-1 rounded bg-white/10 disabled:opacity-30"
                onClick={() => setPage((p) => p - 1)}
            >
                {t("inbox.prev") || "Previous"}
            </button>

            <span>
                {t("inbox.page")} {page}/{totalPages}
            </span>

            <button
                disabled={page >= totalPages}
                className="px-3 py-1 cursor-pointer rounded bg-white/10 disabled:opacity-30"
                onClick={() => setPage((p) => p + 1)}
            >
                {t("inbox.next") || "Next"}
            </button>
        </div>
    );

    // -------- TOOLBAR CONFIG --------
    const toolbarActions = [
        {
            label: t("inbox.2"),
            onClick: () => setIsComposeOpen(true),
            style: "cursor-pointer rounded-full bg-linear-to-r from-cyan-500 to-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-cyan-500/20",
        },
        { label: t("inbox.3"), onClick: refreshEmails },
        { label: t("inbox.4"), onClick: selectAll },
        {
            label: t("inbox.5"),
            onClick: deleteSelected,
            style: "rounded-full cursor-pointer border border-red-500/50 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20",
        },
        { label: t("inbox.6"), onClick: () => markSelected(true) },
        { label: t("inbox.7"), onClick: () => markSelected(false) },
    ];

    return (
        <section className="flex-[0_0_30rem] h-full flex flex-col border-r border-white/10 bg-white/5">
            <EmailToolbar
                selectedFolder={selectedFolder}
                actions={toolbarActions}
            />
            {(isFetching || isLoading) && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10"></div>
            )}
            <div
                ref={emailListRef}
                className="relative flex-1 custom-scroll overflow-y-auto divide-y divide-white/10"
            >
                {/* OVERLAY LOADING WHEN FETCHING NEW PAGE */}

                {isFetching || isLoading ? (
                    <></>
                ) : previewEmails.length === 0 ? (
                    <div className="p-4 text-center text-white/60">
                        {t("inbox.8")}
                    </div>
                ) : (
                    previewEmails.map((email) => (
                        <div
                            key={email.id}
                            data-email-row
                            onClick={() => handleSelectPreviewEmail(email)}
                        >
                            <EmailRow
                                email={email}
                                active={selectedPreviewEmail?.id === email.id}
                                selected={selectedPreviewEmails.has(email.id)}
                                onSelect={handleSelectPreviewEmail}
                                onToggleSelect={toggleSelectPreviewEmail}
                                onToggleStar={toggleStar}
                                onToggleRead={toggleRead}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* PAGINATION */}
            <Pagination />
        </section>
    );
}

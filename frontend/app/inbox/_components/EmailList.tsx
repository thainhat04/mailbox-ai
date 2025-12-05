// components/Inbox/EmailList.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Email, PreviewEmail } from "../_types";
import EmailRow from "./EmailRow";
import EmailToolbar from "./EmailToolbar";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useGetMailInOneBoxQuery, useModifyEmailMutation } from "../_services";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/toast-provider";

interface PreviewEmailListProps {
    selectedFolder: string;
    selectedPreviewEmail: PreviewEmail | null;
    onSelectPreviewEmail: (previewEmail: PreviewEmail | null) => void;
    isComposeOpen: boolean;
    setIsComposeOpen: (open: boolean) => void;
    onEmailModified?: (email: Email) => void;
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
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isPreparing, setIsPreparing] = useState(true);
    const { result, isLoading, isFetching, refetch } = useQueryHandler(
        useGetMailInOneBoxQuery,
        { mailboxId: selectedFolder, page, limit: 50 },
        { skip: !selectedFolder || isPreparing }
    );

    const modifyEmail = useMutationHandler(
        useModifyEmailMutation,
        "ModifyEmail"
    );

    const [previewEmails, setPreviewEmails] = useState<PreviewEmail[]>([]);
    const [selectedPreviewEmails, setSelectedPreviewEmails] = useState<
        Set<string>
    >(new Set());

    const [focusedIndex, setFocusedIndex] = useState<number>(-1);
    const emailListRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Reset when folder changes
    useEffect(() => {
        setPreviewEmails([]);
        setPage(1);
        setHasMore(true);
        setSelectedPreviewEmails(new Set());
        setFocusedIndex(-1);
        setIsPreparing(false);
    }, [selectedFolder]);

    useEffect(() => {
        if (result) {
            setPreviewEmails(result.data.emails);
            setSelectedPreviewEmails((previous) => {
                previous.forEach((id) => {
                    if (!result.data.emails.find((email) => email.id === id)) {
                        previous.delete(id);
                    }
                });
                return new Set(previous);
            });
        }
    }, [result]);

    // Infinite scroll observer

    useEffect(() => {
        if (isLoading || isFetching || !hasMore || modifyEmail.isLoading)
            return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isFetching) {
                    setPage((prev) => prev + 1);
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMore, isFetching, isLoading, modifyEmail.isLoading]);

    // Keyboard navigation
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
            if (focusedIndex >= 0 && focusedIndex < previewEmails.length) {
                handleSelectPreviewEmail(previewEmails[focusedIndex]);
            }
        },

        enabled: !isComposeOpen && focusedIndex >= 0,
    });

    // Auto scroll
    useEffect(() => {
        if (focusedIndex >= 0 && emailListRef.current) {
            const emailRows =
                emailListRef.current.querySelectorAll("[data-email-row]");
            const focusedRow = emailRows[focusedIndex];
            if (focusedRow) {
                focusedRow.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
            }
        }
    }, [focusedIndex]);

    // Toggle checkbox
    const toggleSelectPreviewEmail = (emailId: string) => {
        setSelectedPreviewEmails((prev) => {
            const newSet = new Set(prev);
            newSet.has(emailId) ? newSet.delete(emailId) : newSet.add(emailId);
            return newSet;
        });
    };

    // Select email
    const handleSelectPreviewEmail = (previewEmail: PreviewEmail) => {
        onSelectPreviewEmail(previewEmail);
    };

    const selectAll = () =>
        setSelectedPreviewEmails(new Set(previewEmails.map((e) => e.id)));

    const deleteSelected = async () => {
        const deletedIds = Array.from(selectedPreviewEmails);

        // Call API for each selected email
        const promises = deletedIds.map(async (emailId) => {
            const result = await modifyEmail.ModifyEmail({
                emailId,
                mailBox: selectedFolder,
                flags: { delete: true },
            });
            if (result) {
                // setPreviewEmails((prev) =>
                //     prev.filter((e) => e.id !== emailId)
                // );
                if (selectedPreviewEmail?.id === emailId) {
                    onSelectPreviewEmail(null);
                }
            } else {
                showToast(t("inbox.emailDeleteError"), "error");
            }
        });

        await Promise.all(promises);
        setSelectedPreviewEmails(new Set());
    };

    const markSelected = async (read: boolean) => {
        // Call API for each selected email
        const promises = Array.from(selectedPreviewEmails).map(
            async (emailId) => {
                const result = await modifyEmail.ModifyEmail({
                    emailId,
                    mailBox: selectedFolder,
                    flags: { read },
                });
                if (result) {
                    // // Optimistic update
                    // setPreviewEmails((prev) =>
                    //     prev.map((e) =>
                    //         e.id === emailId ? { ...e, isRead: read } : e
                    //     )
                    // );
                } else {
                    showToast(t("inbox.emailMarkError"), "error");
                }
            }
        );
        await Promise.all(promises);
        setSelectedPreviewEmails(new Set());
    };
    const refreshEmails = () => {
        setPreviewEmails([]);
        setPage(1);
        setHasMore(true);
        refetch();
        setSelectedPreviewEmails(new Set());
    };

    const toggleStar = async (emailId: string) => {
        const email = previewEmails.find((e) => e.id === emailId);
        if (!email) return;

        const result = await modifyEmail.ModifyEmail({
            emailId,
            mailBox: selectedFolder,
            flags: { starred: !email.isStarred },
        });
        // Optimistic update
        if (!result) {
            showToast(t("inbox.emailStarError"), "error");
        }
        // const updatedEmail = { ...email, isStarred: !email.isStarred };
        // setPreviewEmails((prev) =>
        //     prev.map((e) => (e.id === emailId ? updatedEmail : e))
        // );
    };

    const toggleRead = async (emailId: string) => {
        const email = previewEmails.find((e) => e.id === emailId);
        if (!email) return;

        // Call API
        const result = await modifyEmail.ModifyEmail({
            emailId,
            mailBox: selectedFolder,
            flags: { read: !email.isRead },
        });
        if (!result) {
            showToast(t("inbox.emailMarkError"), "error");
        }
        const updatedEmail = { ...email, isRead: !email.isRead };
        // Optimistic update
        setPreviewEmails((prev) =>
            prev.map((e) => (e.id === emailId ? updatedEmail : e))
        );
    };

    const toolbarActions = [
        {
            label: t("inbox.2"),
            onClick: () => setIsComposeOpen(true),
            style: "cursor-pointer rounded-full bg-linear-to-r from-cyan-500 to-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition hover:shadow-cyan-500/30",
        },
        { label: t("inbox.3"), onClick: refreshEmails },
        { label: t("inbox.4"), onClick: selectAll },
        {
            label: t("inbox.5"),
            onClick: deleteSelected,
            style: "rounded-full cursor-pointer border border-red-500/50 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20 hover:shadow-md hover:shadow-red-500/30 transition",
        },
        { label: t("inbox.6"), onClick: () => markSelected(true) },
        { label: t("inbox.7"), onClick: () => markSelected(false) },
    ];

    return (
        <section className="flex-[0_0_30rem] h-full flex flex-col border-r border-white/10 bg-white/5 backdrop-blur-md">
            <EmailToolbar
                selectedFolder={selectedFolder}
                actions={toolbarActions}
            />

            <div
                ref={emailListRef}
                data-email-list
                className="relative flex-1 custom-scroll overflow-y-auto divide-y divide-white/10"
            >
                {isLoading || isFetching || modifyEmail.isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 px-4 py-3 animate-pulse border-b border-white/5"
                        >
                            <div className="h-4 w-4 rounded bg-white/10 shrink-0" />
                            <div className="h-4 w-4 rounded bg-white/10 shrink-0" />
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="h-4 w-32 rounded bg-white/10" />
                                    <div className="h-3 w-12 rounded bg-white/10" />
                                </div>
                                <div className="h-3 w-3/4 rounded bg-white/10" />
                                <div className="h-3 w-1/2 rounded bg-white/10" />
                            </div>
                        </div>
                    ))
                ) : previewEmails.length === 0 ? (
                    <div className="p-4 text-center text-sm text-white/60">
                        {t("inbox.8")}
                    </div>
                ) : (
                    <>
                        {previewEmails.map((email, index) => (
                            <div
                                key={email.id}
                                data-email-row
                                onClick={() => {
                                    handleSelectPreviewEmail(email);
                                }}
                            >
                                <EmailRow
                                    email={email}
                                    active={
                                        selectedPreviewEmail?.id === email.id
                                    }
                                    selected={selectedPreviewEmails.has(
                                        email.id
                                    )}
                                    onSelect={handleSelectPreviewEmail}
                                    onToggleSelect={toggleSelectPreviewEmail}
                                    onToggleStar={toggleStar}
                                    onToggleRead={toggleRead}
                                />
                            </div>
                        ))}

                        {/* Infinite scroll trigger */}
                        {hasMore && (
                            <div ref={loadMoreRef} className="p-4 text-center">
                                {isFetching ? (
                                    <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
                                        <span>
                                            {t("inbox.9") || "Loading more..."}
                                        </span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() =>
                                            setPage((prev) => prev + 1)
                                        }
                                        className="text-sm text-cyan-400 hover:text-cyan-300 transition"
                                    >
                                        {t("inbox.10") || "Load more"}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

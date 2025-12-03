// components/Inbox/EmailList.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Email } from "../_types";
import EmailRow from "./EmailRow";
import ComposeModal from "./ComposeModal";
import EmailToolbar from "./EmailToolbar";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useGetMailInOneBoxQuery, useModifyEmailMutation } from "../_services";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useTranslation } from "react-i18next";

interface EmailListProps {
    selectedFolder: string;
    selectedEmail: Email | null;
    onSelectEmail: (email: Email) => void;
    isComposeOpen: boolean;
    setIsComposeOpen: (open: boolean) => void;
    onEmailModified?: (email: Email) => void;
}

export default function EmailList({
    selectedFolder,
    selectedEmail,
    onSelectEmail,
    isComposeOpen,
    setIsComposeOpen,
    onEmailModified,
}: EmailListProps) {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const { result, isLoading, isFetching, refetch } = useQueryHandler(
        useGetMailInOneBoxQuery,
        { mailboxId: selectedFolder, page, limit: 50 },
        { skip: !selectedFolder }
    );
    
    const modifyEmail = useMutationHandler(
        useModifyEmailMutation,
        "ModifyEmail"
    );

    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(
        new Set()
    );

    const [focusedIndex, setFocusedIndex] = useState<number>(-1);
    const emailListRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Reset when folder changes
    useEffect(() => {
        setEmails([]);
        setPage(1);
        setHasMore(true);
        setSelectedEmails(new Set());
        setFocusedIndex(-1);
    }, [selectedFolder]);

    useEffect(() => {
        if (result) {
            console.log("Fetched emails:", result.data.emails);
            const newEmails = result.data.emails;
            
            if (page === 1) {
                // First page - replace all emails
                setEmails(newEmails);
            } else {
                // Subsequent pages - append emails
                setEmails((prev) => {
                    const existingIds = new Set(prev.map(e => e.id));
                    const uniqueNewEmails = newEmails.filter(e => !existingIds.has(e.id));
                    return [...prev, ...uniqueNewEmails];
                });
            }
            
            // Check if there are more pages
            const totalPages = result.data.totalPages;
            setHasMore(page < totalPages);
        }
    }, [result, page]);

    // Infinite scroll observer
    useEffect(() => {
        if (isLoading || isFetching || !hasMore) return;

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
    }, [hasMore, isFetching, isLoading]);

    // Keyboard navigation
    useKeyboardNavigation({
        onArrowUp: () => {
            if (emails.length === 0) return;
            setFocusedIndex((prev) =>
                prev <= 0 ? emails.length - 1 : prev - 1
            );
        },
        onArrowDown: () => {
            if (emails.length === 0) return;
            setFocusedIndex((prev) =>
                prev === -1 ? 0 : prev >= emails.length - 1 ? 0 : prev + 1
            );
        },
        onEnter: () => {
            if (focusedIndex >= 0 && focusedIndex < emails.length) {
                handleSelectEmail(emails[focusedIndex]);
            }
        },
        onDelete: () => {
            if (focusedIndex >= 0 && focusedIndex < emails.length) {
                deleteEmails([emails[focusedIndex].id]);
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
    const toggleSelectEmail = (emailId: string) => {
        setSelectedEmails((prev) => {
            const newSet = new Set(prev);
            newSet.has(emailId) ? newSet.delete(emailId) : newSet.add(emailId);
            return newSet;
        });
    };

    // Select email
    const handleSelectEmail = (email: Email) => {
        onSelectEmail(email);
    };

    const selectAll = () => setSelectedEmails(new Set(emails.map((e) => e.id)));
    const deleteSelected = async () => {
        const deletedIds = Array.from(selectedEmails);
        setEmails((prev) => prev.filter((e) => !selectedEmails.has(e.id)));
        setSelectedEmails(new Set());

        // Call API for each selected email
        const promises = deletedIds.map((emailId) =>
            modifyEmail.ModifyEmail({
                emailId,
                mailBox: selectedFolder,
                flags: { delete: true }
            })
        );

        await Promise.all(promises);
    };
    const deleteEmails = (ids: string[]) => {
        setEmails((prev) => prev.filter((e) => !ids.includes(e.id)));
    };
    const markSelected = async (read: boolean) => {
        setEmails((prev) =>
            prev.map((e) =>
                selectedEmails.has(e.id) ? { ...e, isRead: read } : e
            )
        );

        // Call API for each selected email
        const promises = Array.from(selectedEmails).map((emailId) =>
            modifyEmail.ModifyEmail({
                emailId,
                mailBox: selectedFolder,
                flags: { read }
            })
        );

        await Promise.all(promises);
    };
    const refreshEmails = () => {
        setEmails([]);
        setPage(1);
        setHasMore(true);
        refetch();
        setSelectedEmails(new Set());
    };

    const toggleStar = async (emailId: string) => {
        const email = emails.find((e) => e.id === emailId);
        if (!email) return;

        const updatedEmail = { ...email, isStarred: !email.isStarred };

        // Optimistic update
        setEmails((prev) =>
            prev.map((e) =>
                e.id === emailId ? updatedEmail : e
            )
        );

        // Call API
        const result = await modifyEmail.ModifyEmail({
            emailId,
            mailBox: selectedFolder,
            flags: { starred: !email.isStarred }
        });

        // If failed, revert optimistic update
        if (!result) {
            setEmails((prev) =>
                prev.map((e) =>
                    e.id === emailId ? email : e
                )
            );
        } else {
            onEmailModified?.(updatedEmail);
        }
    };

    const toggleRead = async (emailId: string) => {
        const email = emails.find((e) => e.id === emailId);
        if (!email) return;

        const updatedEmail = { ...email, isRead: !email.isRead };

        // Optimistic update
        setEmails((prev) =>
            prev.map((e) =>
                e.id === emailId ? updatedEmail : e
            )
        );

        // Call API
        const result = await modifyEmail.ModifyEmail({
            emailId,
            mailBox: selectedFolder,
            flags: { read: !email.isRead }
        });

        // If failed, revert optimistic update
        if (!result) {
            setEmails((prev) =>
                prev.map((e) =>
                    e.id === emailId ? email : e
                )
            );
        } else {
            onEmailModified?.(updatedEmail);
        }
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
                {isLoading || isFetching ? (
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
                ) : emails.length === 0 ? (
                    <div className="p-4 text-center text-sm text-white/60">
                        {t("inbox.8")}
                    </div>
                ) : (
                    <>
                        {emails.map((email, index) => (
                            <div
                                key={email.id}
                                data-email-row
                                onClick={() => {
                                    handleSelectEmail(email);
                                }}
                            >
                                <EmailRow
                                    email={email}
                                    active={selectedEmail?.id === email.id}
                                    selected={selectedEmails.has(email.id)}
                                    onSelect={handleSelectEmail}
                                    onToggleSelect={toggleSelectEmail}
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
                                        <span>{t("inbox.9") || "Loading more..."}</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setPage((prev) => prev + 1)}
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

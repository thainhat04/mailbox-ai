// components/Inbox/EmailList.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import type { Email } from "../_types";
import EmailRow from "./EmailRow";
import ComposeModal from "./ComposeModal";
import EmailToolbar from "./EmailToolbar";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import {
    useGetMailInOneBoxQuery,
} from "../_services";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useTranslation } from "react-i18next";

interface EmailListProps {
    selectedFolder: string;
    selectedEmail: Email | null;
    onSelectEmail: (email: Email) => void;
    isComposeOpen: boolean;
    setIsComposeOpen: (open: boolean) => void;
}

export default function EmailList({
    selectedFolder,
    selectedEmail,
    onSelectEmail,
    isComposeOpen,
    setIsComposeOpen,
}: EmailListProps) {
    const { t } = useTranslation();
    const { result, isLoading, isFetching, refetch } = useQueryHandler(
        useGetMailInOneBoxQuery,
        { mailboxId: selectedFolder },
        { skip: !selectedFolder }
    );

    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(
        new Set()
    );

    const [focusedIndex, setFocusedIndex] = useState<number>(-1);
    const emailListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (result) {
            setEmails(result.data.emails);
            setSelectedEmails(new Set());
            setFocusedIndex(-1);
        }
    }, [result]);

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
        setEmails((prev) =>
            prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
        );
        onSelectEmail({ ...email, isRead: true });
    };

    const selectAll = () => setSelectedEmails(new Set(emails.map((e) => e.id)));
    const deleteSelected = () => {
        setEmails((prev) => prev.filter((e) => !selectedEmails.has(e.id)));
        setSelectedEmails(new Set());
    };
    const deleteEmails = (ids: string[]) => {
        setEmails((prev) => prev.filter((e) => !ids.includes(e.id)));
    };
    const markSelected = (read: boolean) => {
        setEmails((prev) =>
            prev.map((e) =>
                selectedEmails.has(e.id) ? { ...e, isRead: read } : e
            )
        );
    };
    const refreshEmails = () => {
        refetch();
        setSelectedEmails(new Set());
    };

    const toggleStar = (emailId: string) => {
        setEmails((prev) =>
            prev.map((e) =>
                e.id === emailId ? { ...e, isStarred: !e.isStarred } : e
            )
        );
    };

    const toggleRead = (emailId: string) => {
        setEmails((prev) =>
            prev.map((e) =>
                e.id === emailId ? { ...e, isRead: !e.isRead } : e
            )
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
                {(isLoading || isFetching) ? (
                    Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse border-b border-white/5">
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
                    emails.map((email, index) => (
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
                    ))
                )}
            </div>
        </section>
    );
}

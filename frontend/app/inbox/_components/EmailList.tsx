// components/Inbox/EmailList.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import type { Email } from "../_types";
import EmailRow from "./EmailRow";
import ComposeModal from "./ComposeModal";
import EmailToolbar from "./EmailToolbar";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useGetMailInOneBoxQuery } from "../_services";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

interface EmailListProps {
    selectedFolder: string;
    selectedEmail: Email | null;
    onSelectEmail: (email: Email) => void;
}

export default function EmailList({
    selectedFolder,
    selectedEmail,
    onSelectEmail,
}: EmailListProps) {
    const { result, isLoading, isFetching } = useQueryHandler(
        useGetMailInOneBoxQuery,
        { mailboxId: selectedFolder },
        { skip: !selectedFolder }
    );

    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(
        new Set()
    );
    const [isComposeOpen, setIsComposeOpen] = useState(false);
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
        setEmails([...(result?.data.emails || [])]);
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
            label: "Compose",
            onClick: () => setIsComposeOpen(true),
            style: "cursor-pointer rounded-full bg-linear-to-r from-cyan-500 to-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition hover:shadow-cyan-500/30",
        },
        { label: "Refresh", onClick: refreshEmails },
        { label: "Select All", onClick: selectAll },
        {
            label: "Delete",
            onClick: deleteSelected,
            style: "rounded-full cursor-pointer border border-red-500/50 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20 hover:shadow-md hover:shadow-red-500/30 transition",
        },
        { label: "Mark Read", onClick: () => markSelected(true) },
        { label: "Mark Unread", onClick: () => markSelected(false) },
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
                {(isLoading || isFetching) && (
                    <div className="absolute inset-x-0 top-0 flex justify-center py-3 z-10 pointer-events-none">
                        <div className="flex items-center space-x-2 bg-white/5 rounded-full px-3 py-1 shadow-sm">
                            <svg
                                className="h-5 w-5 text-white animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                />
                            </svg>
                            <span className="text-xs text-white/80">
                                Loading...
                            </span>
                        </div>
                    </div>
                )}

                {emails.length === 0 ? (
                    <div className="p-4 text-center text-sm text-white/60">
                        No emails found.
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

            <ComposeModal
                isOpen={isComposeOpen}
                onClose={() => setIsComposeOpen(false)}
            />
        </section>
    );
}

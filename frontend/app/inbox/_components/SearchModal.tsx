"use client";

import { useState, useEffect } from "react";
import { useSearchEmailsQuery } from "../_services";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import SimpleCardItem from "@/components/ui/SimpleCardItem";
import { PreviewEmail, SearchEmail, ModeSearch } from "../_types";
import EmailDetail from "./CommonMode/EmailDetail";
import { useTranslation, Trans } from "react-i18next";

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    searchQuery: string;
    mode: ModeSearch;
}

export default function SearchModal({
    isOpen,
    onClose,
    searchQuery,
    mode,
}: SearchModalProps) {
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(1);
    const [emails, setEmails] = useState<SearchEmail[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [selectedEmail, setSelectedEmail] = useState<PreviewEmail | null>(
        null
    );
    const limit = 20;

    const { result, isLoading, isFetching, error } = useQueryHandler(
        useSearchEmailsQuery,
        {
            q: searchQuery,
            page: currentPage,
            limit: limit,
            mode: mode,
        },
        {
            skip:
                !isOpen ||
                !searchQuery.trim() ||
                searchQuery.length === 0 ||
                !mode,
        }
    );

    // Reset page khi search query thay đổi
    useEffect(() => {
        setCurrentPage(1);
        setSelectedEmail(null);
        setEmails([]);
        setTotal(0);
        setTotalPages(0);
    }, [searchQuery, mode]);

    useEffect(() => {
        if (result) {
            setEmails(result.data.emails || []);
            setTotal(result.data.total || 0);
            setTotalPages(result?.data.totalPages || 0);
        }
    }, [result]);

    useEffect(() => {
        const header_inbox = document.querySelector(
            ".header_inbox"
        ) as HTMLElement;

        if (isOpen) {
            document.body.style.overflow = "hidden";
            if (header_inbox) {
                header_inbox.style.zIndex = "1";
            }
        } else {
            document.body.style.overflow = "unset";
            if (header_inbox) {
                header_inbox.style.zIndex = "100";
            }
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const handleEmailClick = (email: SearchEmail) => {
        setSelectedEmail(email);
    };

    const handleBackToList = () => {
        setSelectedEmail(null);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal Content */}
            <div
                className="relative backdrop__need backdrop-blur-2xl w-full max-w-7xl bg-linear-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95  rounded-2xl shadow-2xl border border-white/10 h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            {t("search_modal.1")}
                        </h2>
                        {!isFetching && (
                            <p className="text-sm text-white/60 mt-1">
                                <Trans
                                    i18nKey="search_modal.2"
                                    values={{
                                        count: total,
                                        query: searchQuery,
                                    }}
                                    components={{
                                        strong: (
                                            <span className="font-semibold text-white" />
                                        ),
                                        highlight: (
                                            <span className="text-cyan-400" />
                                        ),
                                    }}
                                />
                            </p>
                        )}
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="p-2 cursor-pointer hover:bg-white/10 rounded-lg transition-colors group"
                        aria-label="Close"
                    >
                        <svg
                            className="w-6 h-6 text-white/60 group-hover:text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scroll">
                    {isLoading || isFetching ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                            <p className="text-white/60 mt-4">
                                {t("search_modal.3")}
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <svg
                                className="w-16 h-16 text-red-400/60"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <p className="text-white/60 mt-4">
                                {t("search_modal.5")}
                            </p>
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <svg
                                className="w-16 h-16 text-white/20"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <p className="text-white/60 mt-4 text-lg">
                                {t("search_modal.4")}
                            </p>
                            <p className="text-white/40 text-sm mt-2">
                                {t("search_modal.6")}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {emails.map((email) => (
                                <SimpleCardItem
                                    key={email.id}
                                    item={email}
                                    onClick={handleEmailClick}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && !isLoading && !error && (
                    <div className="border-t border-white/10 p-6">
                        <div
                            style={{
                                alignItems: "stretch",
                            }}
                            className="flex justify-between"
                        >
                            {/* Page Info */}
                            <div className="text-sm text-white/60">
                                {t("search_modal.7", {
                                    current: currentPage,
                                    total: totalPages,
                                })}
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex gap-2">
                                {/* First Page */}
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 cursor-pointer py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                                        />
                                    </svg>
                                </button>

                                {/* Previous Page */}
                                <button
                                    onClick={() =>
                                        setCurrentPage((p) =>
                                            Math.max(1, p - 1)
                                        )
                                    }
                                    disabled={currentPage === 1}
                                    className="px-4 cursor-pointer py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                                >
                                    {t("search_modal.8")}
                                </button>

                                {/* Page Numbers */}
                                <div className="hidden sm:flex items-center gap-2">
                                    {Array.from(
                                        { length: totalPages },
                                        (_, i) => i + 1
                                    )
                                        .filter((page) => {
                                            // Show first, last, current, and nearby pages
                                            return (
                                                page === 1 ||
                                                page === totalPages ||
                                                Math.abs(page - currentPage) <=
                                                    1
                                            );
                                        })
                                        .map((page, idx, arr) => {
                                            // Add ellipsis
                                            const showEllipsis =
                                                idx > 0 &&
                                                page - arr[idx - 1] > 1;
                                            return (
                                                <div
                                                    key={page}
                                                    className="flex items-center gap-2"
                                                >
                                                    {showEllipsis && (
                                                        <span className="text-white/40">
                                                            ...
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() =>
                                                            setCurrentPage(page)
                                                        }
                                                        className={`w-10 h-10 rounded-lg border transition-colors ${
                                                            currentPage === page
                                                                ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-400"
                                                                : "bg-white/5 cursor-pointer border-white/10 text-white/80 hover:bg-white/10"
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                </div>

                                {/* Next Page */}
                                <button
                                    onClick={() =>
                                        setCurrentPage((p) =>
                                            Math.min(totalPages, p + 1)
                                        )
                                    }
                                    disabled={currentPage === totalPages}
                                    className="px-4 cursor-pointer py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                                >
                                    {t("search_modal.9")}
                                </button>

                                {/* Last Page */}
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 cursor-pointer py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 5l7 7-7 7M5 5l7 7-7 7"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Email Detail Overlay */}
                {selectedEmail && (
                    <div className="absolute inset-0 bg-slate-900/98 z-10 flex flex-col">
                        {/* Back Button */}
                        <div className="p-4 border-b border-white/10 flex items-center gap-3">
                            <button
                                onClick={handleBackToList}
                                className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 19l-7-7 7-7"
                                    />
                                </svg>
                                <span className="text-sm font-medium">
                                    {t("search_modal.10")}
                                </span>
                            </button>
                        </div>

                        {/* Email Detail Component */}
                        <div className="flex-1 overflow-hidden">
                            <EmailDetail
                                previewEmail={selectedEmail}
                                onBack={handleBackToList}
                                setPreviewEmail={setSelectedEmail}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import type { Folder } from "../../_types";
import clsx from "clsx";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useGetMailBoxesQuery } from "../../_services";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface FolderListProps {
    selected: string;
    onSelect: (folderId: string) => void;
}

export default function FolderList({ selected, onSelect }: FolderListProps) {
    const { t } = useTranslation();
    const { result, error, isLoading, isFetching, refetch } = useQueryHandler(
        useGetMailBoxesQuery,
        undefined
    );

    const folders: Folder[] = result?.data || [];

    const domFolders = useMemo(() => {
        if (isLoading || isFetching) {
            return Array.from({ length: 5 }).map((_, i) => (
                <li key={i}>
                    <div className="h-9 w-full rounded-lg bg-white/5 animate-pulse" />
                </li>
            ));
        }

        if (error) return <li>{t("inbox.12")}</li>;

        const visibleFolders = folders.filter(
            (f) => f.messageListVisibility !== "hide"
        );

        if (visibleFolders.length === 0) return <li>{t("inbox.13")}</li>;

        return visibleFolders.map((f) => {
            const folderId = f.id;
            const isActive = selected === folderId;
            const unreadCount = f.unreadCount || 0;

            return (
                <li key={folderId} role="listitem">
                    <button
                        onClick={() => {
                            onSelect(folderId);
                        }}
                        className={clsx(
                            "group w-full cursor-pointer rounded-lg px-4 py-2 flex items-center justify-between text-sm transition-colors",
                            isActive
                                ? "bg-white/15 border border-white/20 shadow-inner font-medium text-white"
                                : "hover:bg-white/10 text-white/80"
                        )}
                        aria-current={isActive ? "true" : undefined}
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="truncate">
                                {f.name}
                                {unreadCount > 0 && (
                                    <span className="ml-1.5 text-[11px] text-white/50">
                                        ({unreadCount})
                                    </span>
                                )}
                            </span>
                        </div>
                    </button>
                </li>
            );
        });
    }, [folders, isLoading, isFetching, error, selected, onSelect, t]);

    return (
        <aside className="flex-1 custom-scroll overflow-y-auto border-r border-white/10 bg-white/5 backdrop-blur-md relative">
            <h2 className="px-5 py-4 text-xs font-semibold tracking-wide text-white/70 uppercase">
                {t("inbox.1")}
            </h2>
            <ul role="list" className="space-y-1 px-2 pb-6">
                {domFolders}
            </ul>
        </aside>
    );
}

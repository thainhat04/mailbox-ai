// app/inbox/_components/FolderList.tsx
"use client";

import type { Folder, FolderListProps } from "../_types";
import clsx from "clsx";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useGetMailBoxesQuery } from "../_services";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function FolderList({ selected, onSelect }: FolderListProps) {
    const { t } = useTranslation();
    const { result, error, isLoading, isFetching } = useQueryHandler(
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
        if (error) {
            return <li>{t("inbox.12")}</li>;
        }
        if (folders.length === 0) {
            return <li>{t("inbox.13")}</li>;
        }
        return folders.map((f) => {
            const isActive = selected === f.id;
            return (
                <li key={f.id} role="listitem">
                    <button
                        onClick={() => onSelect(f.id)}
                        className={clsx(
                            "group w-full rounded-lg px-4 py-2 flex items-center justify-between text-sm transition-colors",
                            isActive
                                ? "bg-white/15 border border-white/20 shadow-inner font-medium text-white"
                                : "hover:bg-white/10 text-white/80"
                        )}
                        aria-current={isActive ? "true" : undefined}
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {f.icon && <span className="text-base shrink-0">{f.icon}</span>}
                            <span className="truncate">
                                {f.name}
                                {((['drafts', 'trash', 'sent'].includes(f.id) ? f.totalCount : f.unreadCount) || 0) > 0 && (
                                    <span className="ml-1.5 text-[11px] text-white/50">
                                        ({['drafts', 'trash', 'sent'].includes(f.id) ? f.totalCount : f.unreadCount})
                                    </span>
                                )}
                            </span>
                        </div>
                    </button>
                </li>
            );
        });
    }, [folders, isLoading, isFetching, error, selected]);
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

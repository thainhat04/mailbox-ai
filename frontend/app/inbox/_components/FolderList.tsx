// app/inbox/_components/FolderList.tsx
"use client";

import type { Folder, FolderListProps } from "../_types";
import clsx from "clsx";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useGetMailBoxesQuery } from "../_services";
import { useMemo } from "react";

export default function FolderList({ selected, onSelect }: FolderListProps) {
    const { result, error, isLoading, isFetching } = useQueryHandler(
        useGetMailBoxesQuery,
        undefined
    );
    const folders: Folder[] = result?.data || [];
    const domFolders = useMemo(() => {
        if (isLoading || isFetching) {
            return <li>Loading folders...</li>;
        }
        if (error) {
            return <li>Error loading folders</li>;
        }
        if (folders.length === 0) {
            return <li>No folders found</li>;
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
                        <span className="truncate">{f.name}</span>
                        {f.unreadCount != 0 && (
                            <span className="ml-2 inline-flex min-w-6 justify-center rounded-full bg-linear-to-r from-cyan-500 to-sky-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                                {f.unreadCount}
                            </span>
                        )}
                    </button>
                </li>
            );
        });
    }, [folders, isLoading, isFetching, error, selected]);
    return (
        <aside className="flex-1 custom-scroll overflow-y-auto border-r border-white/10 bg-white/5 backdrop-blur-md relative">
            <h2 className="px-5 py-4 text-xs font-semibold tracking-wide text-white/70 uppercase">
                Mailboxes
            </h2>
            <ul role="list" className="space-y-1 px-2 pb-6">
                {domFolders}
            </ul>
        </aside>
    );
}

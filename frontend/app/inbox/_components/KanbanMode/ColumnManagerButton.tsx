"use client";

import { use, useEffect, useState } from "react";
import { Settings, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import ColumnManagementModal from "./ColumnManagementModal";
import type { KanbanColumnDetails } from "../../_types";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useGetAllColumnDetailsQuery } from "../../_services";

interface Props {
    onCreateColumn: (
        name: string,
        color: string,
        icon: string,
        gmailLabelName: string
    ) => Promise<void>;
    onUpdateColumn: (
        id: string,
        name: string,
        color: string,
        icon: string,
        gmailLabelName: string
    ) => Promise<void>;
    onDeleteColumn: (id: string) => Promise<void>;
    isRefresh: boolean;
    setIsRefresh: (value: boolean) => void;
}

export default function ColumnManagerButton({
    onCreateColumn,
    onUpdateColumn,
    onDeleteColumn,
    isRefresh,
    setIsRefresh,
}: Props) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [columns, setColumn] = useState<KanbanColumnDetails[]>([]);
    const { result, isFetching, refetch } = useQueryHandler(
        useGetAllColumnDetailsQuery,
        undefined
    );
    const [isFetchingData, setIsFetchingData] = useState(false);

    useEffect(() => {
        setIsFetchingData(isFetching);
    }, [isFetching]);

    useEffect(() => {
        if (isRefresh) {
            refetch();
            setIsRefresh(false);
        }
    }, [isRefresh, refetch]);

    useEffect(() => {
        if (isFetchingData) {
            const element = document.querySelector(".main__column-detail");
            element?.scrollTo(0, 0);
            if (element instanceof HTMLElement) {
                element.style.overflow = "hidden";
            }
        } else {
            const element = document.querySelector(".main__column-detail");
            if (element instanceof HTMLElement) {
                element.style.overflow = "auto";
            }
        }
    }, [isFetchingData]);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        mode: "create" | "update" | "delete";
        column?: KanbanColumnDetails;
    }>({
        isOpen: false,
        mode: "create",
    });
    useEffect(() => {
        if (result) {
            setColumn(result.data);
        }
    }, [result]);

    const handleSubmit = async (data: {
        id?: string;
        name: string;
        color: string;
        icon: string;
        gmailLabelName: string;
    }) => {
        setIsFetchingData(true);
        if (modalState.mode === "create") {
            await onCreateColumn(
                data.name,
                data.color,
                data.icon,
                data.gmailLabelName
            );
        } else if (modalState.mode === "update" && data.id) {
            await onUpdateColumn(
                data.id,
                data.name,
                data.color,
                data.icon,
                data.gmailLabelName
            );
        } else if (modalState.mode === "delete" && data.id) {
            await onDeleteColumn(data.id);
        }
        //setModalState({ ...modalState, isOpen: false });
        setIsFetchingData(false);
    };

    return (
        <>
            <div className="relative">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 cursor-pointer rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10"
                    title="Manage Columns"
                >
                    <Settings size={20} />
                </button>

                {isMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsMenuOpen(false)}
                        />
                        <div className="absolute  right-0 mt-2 w-72 bg-gray-900 rounded-lg shadow-2xl border border-white/10 z-20 overflow-hidden">
                            {/* Create Button */}
                            <button
                                onClick={() => {
                                    setModalState({
                                        isOpen: true,
                                        mode: "create",
                                    });
                                }}
                                className="w-full cursor-pointer px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-white border-b border-white/10"
                            >
                                <Plus size={18} className="text-green-400" />
                                <span className="font-medium">
                                    Create New Column
                                </span>
                            </button>

                            {/* Column List */}
                            <div className="max-h-96 main__column-detail overflow-y-auto custom-scroll relative">
                                {isFetchingData && (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                                        <div className="flex flex-col items-center gap-3">
                                            {/* Spinner */}
                                            <div className="relative">
                                                <div className="absolute inset-0 rounded-full border-4 border-white/20 blur-sm" />
                                                <Loader2
                                                    size={40}
                                                    className="text-cyan-400 animate-spin"
                                                    strokeWidth={2}
                                                />
                                            </div>
                                            {/* Loading Text */}
                                            <p className="text-white text-sm font-medium">
                                                Loading...
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {columns.map((column) => (
                                    <div
                                        key={column.id}
                                        className="px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/10 last:border-b-0"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xl">
                                                {column.icon}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-white font-medium text-sm">
                                                    {column.name}
                                                </p>
                                                <p className="text-white/50 text-xs">
                                                    {column.emailCount} emails
                                                </p>
                                            </div>
                                            {column.isSystemProtected && (
                                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                                                    Protected
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setModalState({
                                                        isOpen: true,
                                                        mode: "update",
                                                        column,
                                                    });
                                                }}
                                                disabled={
                                                    column.isSystemProtected
                                                }
                                                className="flex-1 cursor-pointer px-3 py-1.5 flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Edit size={14} />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setModalState({
                                                        isOpen: true,
                                                        mode: "delete",
                                                        column,
                                                    });
                                                }}
                                                disabled={
                                                    column.isSystemProtected
                                                }
                                                className="flex-1 cursor-pointer px-3 py-1.5 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <ColumnManagementModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                mode={modalState.mode}
                column={modalState.column}
                onSubmit={handleSubmit}
            />
        </>
    );
}

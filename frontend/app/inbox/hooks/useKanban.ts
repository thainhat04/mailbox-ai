"use client";

import { useEffect, useState } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import InBoxConstant from "../_constants";
import {
    KanbanBoardData,
    FrozenTimeouts,
    SortOption,
    KanbanItem,
} from "../_types";
import {
    useGetAllKanBanQuery,
    useUpdateKanBanStatusMutation,
    useUpdateFrozenStatusMutation,
    useCreateKanbanColumnMutation,
    useUpdateKanBanColumnMutation,
    useDeleteKanBanColumnMutation,
} from "../_services";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useToast } from "@/components/ui/toast-provider";
import { getTimeoutMs } from "@/helper/get-timeout-ms";
import isFrozenColumn from "@/helper/is-fronzen";
import { it } from "node:test";

function findColumnIdByItem(
    board: KanbanBoardData,
    itemId: string
): string | null {
    for (const [key, items] of Object.entries(board.emails)) {
        if (items.some((i) => i.id === itemId)) return key;
    }
    return null;
}

export default function useKanban() {
    const { showToast } = useToast();
    const [columns, setColumns] = useState<KanbanBoardData>({
        columns: [],
        emails: {},
    });

    // Filter and Sort state
    const [filters, setFilters] = useState({
        unreadOnly: false,
        hasAttachmentsOnly: false,
        fromEmail: "",
    });
    const [sortBy, setSortBy] = useState<SortOption>("date_desc");

    // Fetch
    const { result, isLoading, isFetching, refetch } = useQueryHandler(
        useGetAllKanBanQuery,
        {
            includeDoneAll: true,
            unreadOnly: filters.unreadOnly,
            hasAttachmentsOnly: filters.hasAttachmentsOnly,
            fromEmail: filters.fromEmail || undefined,
            sortBy,
        },
        {
            refetchOnMountOrArgChange: true,
        }
    );
    const frozenStatusMutation = useMutationHandler(
        useUpdateFrozenStatusMutation,
        "Update"
    );

    const updateStatusMutation = useMutationHandler(
        useUpdateKanBanStatusMutation,
        "Update"
    );

    const createColumnMutation = useMutationHandler(
        useCreateKanbanColumnMutation,
        "Create"
    );

    const updateColumnMutation = useMutationHandler(
        useUpdateKanBanColumnMutation,
        "Update"
    );

    const deleteColumnMutation = useMutationHandler(
        useDeleteKanBanColumnMutation,
        "Delete"
    );

    useEffect(() => {
        if (result?.data) setColumns(result.data);
    }, [result]);

    const onDragEnd = async (
        { active, over }: DragEndEvent,
        timeoutDuration?: { duration: FrozenTimeouts; customDateTime?: string }
    ) => {
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        const fromColumnId = findColumnIdByItem(columns, activeId);
        if (!fromColumnId) return;

        // 👉 Nếu drop trực tiếp vào column
        const toColumnId = columns.emails[overId]
            ? overId
            : findColumnIdByItem(columns, overId);

        if (!toColumnId || fromColumnId === toColumnId) return;

        const fromItems = [...columns.emails[fromColumnId]];
        const toItems = [...columns.emails[toColumnId]];

        const activeIndex = fromItems.findIndex((i) => i.id === activeId);
        if (activeIndex === -1) return;

        const [movedItem] = fromItems.splice(activeIndex, 1);
        const toKey = columns.columns.find((c) => c.id === toColumnId)?.key!!;
        const updatedItem: KanbanItem = {
            ...movedItem,
            kanbanColumnId: toColumnId,
            kanbanStatus: toKey,
        };

        // 🧊 FROZEN nghiệp vụ
        if (isFrozenColumn(columns, toColumnId)) {
            const fromKey = columns.columns.find((c) => c.id === fromColumnId)
                ?.key!!;
            updatedItem.previousKanbanStatus = fromKey;

            const ms = getTimeoutMs(timeoutDuration);
            if (ms) {
                updatedItem.snoozedUntil = new Date(
                    Date.now() + ms
                ).toISOString();
            }
        }

        toItems.push(updatedItem);

        const prevState = columns;
        //điều chỉnh emailCount của các cột
        const newColumns = columns.columns.map((col) => {
            if (col.id === fromColumnId) {
                return { ...col, emailCount: col.emailCount - 1 };
            } else if (col.id === toColumnId) {
                return { ...col, emailCount: col.emailCount + 1 };
            }
            return col;
        });
        setColumns((prev) => ({
            columns: newColumns,
            emails: {
                ...prev.emails,
                [fromColumnId]: fromItems,
                [toColumnId]: toItems,
            },
        }));

        try {
            if (isFrozenColumn(columns, toColumnId)) {
                await frozenStatusMutation.UpdateUnWrap({
                    emailId: movedItem.id,
                    duration: timeoutDuration!.duration,
                    customDateTime: timeoutDuration?.customDateTime,
                });
            } else {
                await updateStatusMutation.UpdateUnWrap({
                    id: movedItem.id,
                    newStatus: toColumnId, // ✅ dùng ID
                });
            }
        } catch {
            showToast("Update failed, reverting", "error");
            setColumns(prevState);
        }
    };

    const moveToColumnFromFrozen = async (id: string) => {
        const frozenColumn = columns.columns.find((c) => c.key === "FROZEN");
        if (!frozenColumn) return;

        const item = columns.emails[frozenColumn.id]?.find((i) => i.id === id);
        if (!item || !item.previousKanbanStatus) return;

        const targetColumnId = columns.columns.find(
            (c) => c.key === item.previousKanbanStatus
        )?.id;
        const stateBefore = item.previousKanbanStatus;
        if (!targetColumnId) return;

        setColumns((prev) => ({
            ...prev,
            emails: {
                ...prev.emails,
                [frozenColumn.id]: prev.emails[frozenColumn.id].filter(
                    (i) => i.id !== id
                ),
                [targetColumnId]: [
                    {
                        ...item,
                        snoozedUntil: undefined,
                        previousKanbanStatus: undefined,
                        kanbanStatus: stateBefore,
                        kanbanColumnId: targetColumnId,
                    },
                    ...prev.emails[targetColumnId],
                ],
            },
        }));
    };

    const createKanbanColumn = async (
        name: string,
        color: string,
        icon: string,
        gmailLabelName: string
    ) => {
        if (name.trim() === "") {
            showToast("Column name cannot be empty", "error");
            return;
        }
        if (
            color.trim() === "" ||
            !/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(color)
        ) {
            showToast("Column color cannot be empty", "error");
            return;
        }

        if (icon.trim() === "") {
            showToast("Column icon cannot be empty", "error");
            return;
        }

        if (gmailLabelName.trim() === "") {
            showToast("Gmail label name cannot be empty", "error");
            return;
        }

        let snapshot: KanbanBoardData | null = null;

        const tempId = `temp-${Date.now()}`;

        setColumns((prev) => {
            snapshot = prev;
            return {
                ...prev,
                columns: [
                    ...prev.columns,
                    {
                        id: tempId,
                        name,
                        color,
                        icon,
                        key: name.toUpperCase(),
                        order: prev.columns.length,
                        isSystemProtected: false,
                        emailCount: 0,
                    },
                ],
                emails: {
                    ...prev.emails,
                    [tempId]: [],
                },
            };
        });

        const result = await createColumnMutation.Create({
            name,
            color,
            icon,
            gmailLabelName,
        });

        if (!result || !result.data) {
            if (snapshot) setColumns(snapshot);
            showToast("Create failed, reverting", "error");
            return;
        }

        setColumns((prev) => ({
            ...prev,
            columns: prev.columns.map((col) =>
                col.id === tempId ? { ...result.data, emailCount: 0 } : col
            ),
            emails: {
                ...prev.emails,
                [result.data.id]: prev.emails[tempId] ?? [],
            },
        }));
    };

    const updateKanbanColumn = async (
        id: string,
        name: string,
        color: string,
        icon: string,
        gmailLabelName: string
    ) => {
        if (name.trim() === "") {
            showToast("Column name cannot be empty", "error");
            return;
        }
        if (
            color.trim() === "" ||
            !/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(color)
        ) {
            showToast("Column color cannot be empty", "error");
            return;
        }

        if (icon.trim() === "") {
            showToast("Column icon cannot be empty", "error");
            return;
        }

        let snapshot: KanbanBoardData | null = null;

        setColumns((prev) => {
            snapshot = prev;
            return {
                ...prev,
                columns: prev.columns.map((col) =>
                    col.id === id ? { ...col, name, color, icon } : col
                ),
            };
        });

        const result = await updateColumnMutation.Update({
            id,
            body: { name, color, icon, gmailLabelName },
        });

        if (!result || !result.data) {
            if (snapshot) setColumns(snapshot);
            showToast("Update failed, reverting", "error");
            return;
        }

        setColumns((prev) => ({
            ...prev,
            columns: prev.columns.map((col) =>
                col.id === id
                    ? { ...result.data, emailCount: col.emailCount }
                    : col
            ),
        }));
    };

    const deleteKanbanColumn = async (id: string) => {
        let snapshot: KanbanBoardData | null = null;
        const inboxColumn = columns.columns.find(
            (c) => c.key === InBoxConstant.KANBAN_INBOX_KEY
        );
        if (!inboxColumn) {
            showToast("Inbox column not found, cannot delete", "error");
            return;
        }
        const inboxId = inboxColumn.id;
        const itemsToMove = [...(columns.emails[id] ?? [])];

        setColumns((prev) => {
            snapshot = prev;
            return {
                ...prev,
                columns: prev.columns.filter((col) => col.id !== id),
                emails: {
                    ...prev.emails,
                    [inboxId]: [...prev.emails[inboxId], ...itemsToMove],
                    [id]: undefined!,
                },
            };
        });

        const result = await deleteColumnMutation.Delete({ id });

        if (!result) {
            if (snapshot) setColumns(snapshot);
            showToast("Delete failed, reverting", "error");
            return;
        }
    };

    return {
        columns,
        onDragEnd,
        isLoading: isLoading || isFetching,
        refetch,
        moveToColumnFromFrozen,
        filters,
        setFilters,
        sortBy,
        setSortBy,
        createKanbanColumn,
        updateKanbanColumn,
        deleteKanbanColumn,
    };
}

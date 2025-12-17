"use client";

import { useEffect, useState } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import InBoxConstant from "../_constants";
import {
    KanbanBoardData,
    KanbanColumnKey,
    KanbanStatus,
    FrozenTimeouts,
    SortOption,
} from "../_types";
import {
    useGetAllKanBanQuery,
    useUpdateKanBanStatusMutation,
    useUpdateFrozenStatusMutation,
} from "../_services";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useToast } from "@/components/ui/toast-provider";
import { getTimeoutMs } from "@/helper/get-timeout-ms";

// Helper kiểm tra key hợp lệ
const isCol = (key: string): key is KanbanColumnKey =>
    ["inbox", "todo", "processing", "done", "frozen"].includes(key);

export default function useKanban() {
    const { showToast } = useToast();
    const [columns, setColumns] = useState<KanbanBoardData>({
        inbox: [],
        todo: [],
        processing: [],
        done: [],
        frozen: [],
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
    const updateStatusHandler = async (
        id: string,
        newStatus: KanbanStatus,
        timeoutDuration?: { duration: FrozenTimeouts; customDateTime?: string }
    ) => {
        if (!id || !newStatus) return;
        if (newStatus.toUpperCase() === InBoxConstant.nameFrozenColumn) {
            return await frozenStatusMutation.UpdateUnWrap({
                emailId: id,
                duration: timeoutDuration?.duration!,
                customDateTime: timeoutDuration?.customDateTime,
            });
        }
        return await updateStatusMutation.UpdateUnWrap({ id, newStatus });
    };
    const updateStatusMutation = useMutationHandler(
        useUpdateKanBanStatusMutation,
        "Update"
    );
    useEffect(() => {
        if (result?.data) setColumns(result.data);
    }, [result]);

    const onDragEnd = (
        { active, over }: DragEndEvent,
        timeoutDuration?: { duration: FrozenTimeouts; customDateTime?: string }
    ) => {
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        if (activeId === overId) return;

        let fromCol: KanbanColumnKey | null = null;
        let toCol: KanbanColumnKey | null = null;

        // Find source column
        for (const col in columns) {
            if (
                isCol(col) &&
                columns[col].some((item) => item.id === activeId)
            ) {
                fromCol = col;
                break;
            }
        }
        if (!fromCol) return;

        // Determine target column
        if (isCol(overId)) {
            toCol = overId; // dragging onto column
        } else {
            for (const col in columns) {
                if (
                    isCol(col) &&
                    columns[col].some((item) => item.id === overId)
                ) {
                    toCol = col;
                    break;
                }
            }
        }
        if (!toCol) return;

        const fromItems = [...columns[fromCol]];
        const toItems = fromCol === toCol ? fromItems : [...columns[toCol]];

        const activeIndex = fromItems.findIndex((i) => i.id === activeId);
        const overIndex = toItems.findIndex((i) => i.id === overId);

        if (activeIndex === -1) return;

        const [movedItem] = fromItems.splice(activeIndex, 1);

        // Same column reorder
        if (fromCol === toCol) {
            const finalIndex = overIndex === -1 ? toItems.length : overIndex;
            toItems.splice(finalIndex, 0, movedItem);

            setColumns((prev) => ({
                ...prev,
                [fromCol!]: toItems,
            }));
            return;
        }

        // Different column
        const finalIndex = overIndex === -1 ? toItems.length : overIndex;

        // Update status
        const updatedItem = {
            ...movedItem,
            kanbanStatus: toCol.toUpperCase() as KanbanStatus,
        };

        // Frozen logic
        const prevColumns = { ...columns };
        //let timeoutId: NodeJS.Timeout;
        if (toCol.toUpperCase() === InBoxConstant.nameFrozenColumn) {
            const ms = getTimeoutMs(timeoutDuration);
            updatedItem.snoozedUntil = ms
                ? new Date(Date.now() + ms).toISOString()
                : undefined;
            updatedItem.previousKanbanStatus =
                fromCol.toUpperCase() as KanbanStatus;
            // timeoutId = setTimeout(() => {
            //     updatedItem.kanbanStatus =
            //         fromCol!.toUpperCase() as KanbanStatus;
            //     updatedItem.snoozedUntil = undefined;
            //     console.log("Auto-moving item from frozen:", updatedItem);
            //     setColumns((prev) => ({
            //         ...prev,
            //         [fromCol!]: [...prev[fromCol!], updatedItem], //bỏ sort
            //         [toCol!]: prev[toCol!].filter(
            //             (i) => i.id !== updatedItem.id
            //         ),
            //     }));
            // }, ms);
        }

        toItems.splice(finalIndex, 0, updatedItem);

        setColumns((prev) => ({
            ...prev,
            [fromCol!]: fromItems,
            [toCol!]: toItems,
        }));
        // Call mutation

        updateStatusHandler(
            movedItem.id,
            updatedItem.kanbanStatus,
            timeoutDuration
        ).catch(() => {
            showToast(
                "Failed to update item status. Reverting changes.",
                "error"
            );
            setColumns(prevColumns);
            // if (toCol!.toUpperCase() === InBoxConstant.nameFrozenColumn) {
            //     clearTimeout(timeoutId);
            // }
        });
    };
    const moveToColumnFromFrozen = async (id: string) => {
        let item = columns.frozen.find((i) => i.id === id);
        if (!item) return;
        item = {
            ...item,
            kanbanStatus: item.previousKanbanStatus || "INBOX",
            snoozedUntil: undefined,
        };
        // inbox.sort(
        //     (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        // );
        //xóa trong fronzen
        const key =
            item.previousKanbanStatus!.toLowerCase() as keyof KanbanBoardData;
        setColumns((prev) => ({
            ...prev,
            frozen: prev.frozen.filter((i) => i.id !== id),
            [key]: [item, ...prev[key]],
        }));
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
    };
}

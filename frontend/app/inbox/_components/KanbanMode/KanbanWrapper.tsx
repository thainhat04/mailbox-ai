"use client";

import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
    DragCancelEvent,
    DragOverEvent,
} from "@dnd-kit/core";

import { useEffect, useRef, useState } from "react";
import Board from "./Board";
import type {
    KanbanBoardData,
    KanbanItem,
    FrozenTimeouts,
} from "../../_types/kanban";

import CardItem from "./CardItem";
import constant from "../../_constants";
import { SummaryModalProvider } from "./SummaryModalContext";
import isFrozenColumnById from "@/helper/is-fronzen";
import FreezeSelector from "./FreezeSelector";
import { KanbanRefetchContext } from "../../_hooks/KanbanRefetchContext";
import { useToast } from "@/components/ui/toast-provider";

interface KanbanWrapperProps {
    columns: KanbanBoardData;
    onDragEnd: (
        event: DragEndEvent,
        timeoutDuration?: {
            duration: FrozenTimeouts;
            customDateTime?: string;
        }
    ) => void;
    refetch: () => void;
    moveToColumnFromFrozen: (id: string) => Promise<void>;
}
const findItemById = (
    board: KanbanBoardData,
    itemId: string
): KanbanItem | null => {
    for (const items of Object.values(board.emails)) {
        const found = items.find((i) => i.id === itemId);
        if (found) return found;
    }
    return null;
};
const findColumnIdByItemId = (
    board: KanbanBoardData,
    itemId: string
): string | null => {
    for (const [columnId, items] of Object.entries(board.emails)) {
        if (items.some((i) => i.id === itemId)) return columnId;
    }
    return null;
};

export default function KanbanWrapper({
    columns,
    onDragEnd,
    refetch,
    moveToColumnFromFrozen,
}: KanbanWrapperProps) {
    const { showToast } = useToast();
    // 🔥 Overlay state — item đang được kéo
    const [activeItem, setActiveItem] = useState<KanbanItem | null>(null);
    const [activeColumn, setActiveColumn] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const eventRef = useRef<DragEndEvent | null>(null);
    const [timeoutDuration, setTimeoutDuration] = useState<{
        duration: FrozenTimeouts;
        customDateTime?: string;
    } | null>(null);

    const confirmTimeOutHandle = (
        duration: FrozenTimeouts,
        customDateTime?: string
    ) => {
        setTimeoutDuration({ duration, customDateTime });
        setModalOpen(false);
    };

    useEffect(() => {
        if (timeoutDuration && eventRef.current) {
            //check thời gian có lớn hơn hiện tại không
            const now = new Date();
            if (
                timeoutDuration.duration === "CUSTOM" &&
                timeoutDuration.customDateTime
            ) {
                const selectedDate = new Date(timeoutDuration.customDateTime);
                if (selectedDate <= now) {
                    showToast("Please select a future date and time.", "error");
                    setTimeoutDuration(null);
                    eventRef.current = null;
                    return;
                }
            }
            onDragEnd(eventRef.current, timeoutDuration);
            eventRef.current = null;
            setTimeoutDuration(null);
        }
    }, [timeoutDuration, onDragEnd]);
    // Sensor để kích hoạt drag bằng chuột
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    // Khi bắt đầu kéo
    const handleDragStart = ({ active }: DragStartEvent) => {
        const id = String(active.id);
        const item = findItemById(columns, id);
        if (!item) return;
        setActiveItem(item);
        const columnId = findColumnIdByItemId(columns, id);
        if (columnId) setActiveColumn(columnId);
    };

    // Khi thả
    const handleDragEnd = (event: DragEndEvent) => {
        setActiveItem(null);
        setActiveColumn(null);
        if (!event.over) return;
        const activeId = String(event.active.id);
        const overId = String(event.over.id);
        const fromColumnId = findColumnIdByItemId(columns, activeId);
        if (!fromColumnId) return;
        // Nếu drop trực tiếp lên column
        const toColumnId = columns.emails[overId]
            ? overId
            : findColumnIdByItemId(columns, overId);
        if (!toColumnId) return;
        // 🧊 Frozen → mở modal
        if (isFrozenColumnById(columns, toColumnId)) {
            setModalOpen(true);
            eventRef.current = event;
            return;
        }
        // Bình thường
        onDragEnd(event);
    };

    // Khi cancel (thả bên ngoài)
    const handleDragCancel = (_: DragCancelEvent) => {
        setActiveItem(null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const overId = event.over?.id;
        if (!overId) return;
        const overIdStr = String(overId);
        // Hover lên item
        const columnId = findColumnIdByItemId(columns, overIdStr);
        if (columnId) {
            setActiveColumn(columnId);
            return;
        }
        // Hover trực tiếp lên column
        if (columns.emails[overIdStr]) {
            setActiveColumn(overIdStr);
        }
    };
    return (
        <KanbanRefetchContext.Provider
            value={{ refetch, moveToColumnFromFrozen }}
        >
            <SummaryModalProvider>
                <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                    onDragOver={handleDragOver}
                    autoScroll={true}
                >
                    {" "}
                    <Board board={columns} activeColumn={activeColumn} />
                    {/* 🔥 DragOverlay — Clone item bay theo chuột */}
                    <DragOverlay>
                        {activeItem ? (
                            <CardItem item={activeItem} isOverlay />
                        ) : null}
                    </DragOverlay>
                    <FreezeSelector
                        isOpen={modalOpen}
                        onClose={() => setModalOpen(false)}
                        onConfirm={confirmTimeOutHandle}
                    />
                </DndContext>
            </SummaryModalProvider>
        </KanbanRefetchContext.Provider>
    );
}

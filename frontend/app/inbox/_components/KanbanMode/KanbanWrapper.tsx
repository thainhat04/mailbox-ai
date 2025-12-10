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
import FreezeSelector from "./FreezeSelector";
import { KanbanRefetchContext } from "../../hooks/KanbanRefetchContext";

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
    moveToInboxFromFrozen: (id: string) => Promise<void>;
}

export default function KanbanWrapper({
    columns,
    onDragEnd,
    refetch,
    moveToInboxFromFrozen,
}: KanbanWrapperProps) {
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

    // Convert tất cả item thành danh sách ID
    const allIds = Object.values(columns)
        .flat()
        .map((item) => item.id);

    // Khi bắt đầu kéo
    const handleDragStart = ({ active }: DragStartEvent) => {
        const id = String(active.id);

        // Tìm item theo ID
        for (const col in columns) {
            const found = columns[col as keyof KanbanBoardData].find(
                (i) => i.id === id
            );
            if (found) {
                setActiveItem(found);
                break;
            }
        }
    };

    // Khi thả
    const handleDragEnd = (event: DragEndEvent) => {
        setActiveItem(null); // remove overlay
        setActiveColumn(null); // reset active column
        if (!event.over) return;
        const overId = String(event.over?.id);
        let overColumnId: string | null = null;
        for (const col in columns) {
            const found = columns[col as keyof KanbanBoardData].find(
                (i) => i.id === overId
            );
            if (found) {
                overColumnId = col;
                break;
            }
        }
        if (!overColumnId) {
            overColumnId = event.over?.id as string;
        }
        if (overColumnId.toUpperCase() === constant.nameFrozenColumn) {
            setModalOpen(true);
            eventRef.current = event;
        } else onDragEnd(event); // run your original logic
    };

    // Khi cancel (thả bên ngoài)
    const handleDragCancel = (_: DragCancelEvent) => {
        setActiveItem(null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        //find id of item column
        const overId = event.over?.id;
        if (!overId) return;
        let overColumnId: string | null = null;
        for (const col in columns) {
            const found = columns[col as keyof KanbanBoardData].find(
                (i) => i.id === overId
            );
            if (found) {
                overColumnId = col;
                break;
            }
        }
        if (overColumnId) {
            setActiveColumn(overColumnId);
            return;
        }
        if (!allIds.includes(String(overId))) {
            setActiveColumn(overId as string);
        }
    };
    return (
        <KanbanRefetchContext.Provider
            value={{ refetch, moveToInboxFromFrozen }}
        >
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                onDragOver={handleDragOver}
                autoScroll={true}
            >
                {" "}
                <Board columns={columns} activeColumn={activeColumn} />
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
        </KanbanRefetchContext.Provider>
    );
}

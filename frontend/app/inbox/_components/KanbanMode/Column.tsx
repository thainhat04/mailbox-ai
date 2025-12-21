"use client";

import { useDroppable } from "@dnd-kit/core";
import CardItem from "./CardItem";
import type { KanbanItem, KanbanColumn } from "../../_types";
interface Props {
    column: KanbanColumn;
    items: KanbanItem[];
    isActive: boolean;
}
export default function Column({ column, items, isActive }: Props) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });

    const isHighlight = isOver || isActive;

    return (
        <div
            ref={setNodeRef}
            className="
                flex-1 rounded-2xl h-full
                border-2 px-2 py-3
                transition-all duration-200 ease-out
            "
            style={{
                borderColor: column.color,
                backgroundColor: isHighlight
                    ? `${column.color}33`
                    : `${column.color}22`,
                boxShadow: isOver
                    ? `0 0 0 3px ${column.color}66`
                    : isActive
                    ? `0 10px 30px ${column.color}55`
                    : undefined,
                transform: isOver ? "scale(1.02)" : undefined,
            }}
        >
            {/* Header */}
            <div className="mb-2 pb-2 border-b border-white/10">
                <h3 className="font-bold uppercase text-xs sm:text-sm tracking-wider text-white/90 flex items-center gap-2">
                    <span className="text-base sm:text-lg">{column.icon}</span>
                    <span className="truncate">{column.name}</span>
                    <div className="flex-1 flex justify-end">
                        <span className="ml-auto px-2.5 py-1 rounded-lg bg-white/10 text-white/80 text-xs font-semibold backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors">
                            {column.emailCount}
                        </span>
                    </div>
                    <span
                        className="ml-auto w-2 h-2 rounded-full transition-all duration-200"
                        style={{
                            backgroundColor: column.color,
                            opacity: isHighlight ? 1 : 0.4,
                            transform: isHighlight ? "scale(1)" : "scale(0.75)",
                        }}
                    />
                </h3>
            </div>

            {/* Empty */}
            {items.length === 0 && (
                <div className="text-white/40 h-[calc(100vh-300px)] text-sm italic py-8 text-center">
                    ✨ Drop emails here
                </div>
            )}

            {/* Cards */}
            {items.length > 0 && (
                <div className="space-y-3 overflow-y-auto h-[calc(100vh-300px)] custom-scroll overflow-x-hidden p-2 pt-1">
                    {items.map((item) => (
                        <CardItem key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

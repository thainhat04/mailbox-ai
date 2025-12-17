"use client";

import { useDroppable } from "@dnd-kit/core";
import CardItem from "./CardItem";
import type { KanbanItem } from "../../_types";

interface Props {
    columnId: string;
    items: KanbanItem[];
    isActive: boolean;
}

// Column styling by type
const getColumnStyle = (columnId: string, isActive: boolean) => {
    const baseClass = `
        flex-1 rounded-2xl 
        transition-all duration-300 ease-out
        h-full border-2 px-2 py-3
    `;

    const columnStyles: Record<
        string,
        { active: string; inactive: string; icon: string }
    > = {
        inbox: {
            active: "bg-blue-500/25 border-blue-400/60 shadow-lg shadow-blue-500/30",
            inactive:
                "bg-blue-500/15 border-blue-400/30 hover:bg-blue-500/20 hover:border-blue-400/40",
            icon: "📥",
        },
        todo: {
            active: "bg-yellow-500/25 border-yellow-400/60 shadow-lg shadow-yellow-500/30",
            inactive:
                "bg-yellow-500/15 border-yellow-400/30 hover:bg-yellow-500/20 hover:border-yellow-400/40",
            icon: "📋",
        },
        processing: {
            active: "bg-purple-500/25 border-purple-400/60 shadow-lg shadow-purple-500/30",
            inactive:
                "bg-purple-500/15 border-purple-400/30 hover:bg-purple-500/20 hover:border-purple-400/40",
            icon: "⚙️",
        },
        done: {
            active: "bg-green-500/25 border-green-400/60 shadow-lg shadow-green-500/30",
            inactive:
                "bg-green-500/15 border-green-400/30 hover:bg-green-500/20 hover:border-green-400/40",
            icon: "✅",
        },
        frozen: {
            active: "bg-cyan-500/25 border-cyan-400/60 shadow-lg shadow-cyan-500/30",
            inactive:
                "bg-cyan-500/15 border-cyan-400/30 hover:bg-cyan-500/20 hover:border-cyan-400/40",
            icon: "❄️",
        },
    };

    const style = columnStyles[columnId.toLowerCase()] || columnStyles.inbox;
    const currentStyle = isActive ? style.active : style.inactive;

    return { baseClass, currentStyle, icon: style.icon };
};

export default function Column({ columnId, items, isActive }: Props) {
    const { setNodeRef } = useDroppable({
        id: columnId,
    });

    const { baseClass, currentStyle, icon } = getColumnStyle(
        columnId,
        isActive
    );

    return (
        <div
            ref={setNodeRef}
            className={`${baseClass} ${currentStyle} w-[calc((100%-32px)/5)]`}
        >
            {/* Column Header */}
            <div className="top-0 z-10 mb-1 pb-2 sm:pb-3 border-b border-white/10">
                <h3 className="font-bold uppercase text-xs sm:text-sm tracking-wider text-white/90 flex items-center gap-1.5 sm:gap-2">
                    <span className="text-base sm:text-lg">{icon}</span>
                    <span
                        className={`inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-200 ${
                            isActive
                                ? "scale-100 opacity-100"
                                : "scale-50 opacity-40"
                        } ${
                            columnId.toLowerCase() === "inbox"
                                ? "bg-blue-400"
                                : columnId.toLowerCase() === "todo"
                                ? "bg-yellow-400"
                                : columnId.toLowerCase() === "processing"
                                ? "bg-purple-400"
                                : columnId.toLowerCase() === "done"
                                ? "bg-green-400"
                                : "bg-cyan-400"
                        }`}
                    />
                    <span className="truncate">{columnId}</span>
                </h3>
            </div>

            {/* Empty State */}
            {items.length === 0 && (
                <div className="text-white/40 h-[calc(100vh-300px)] text-sm italic py-8 text-center">
                    ✨ Drop emails here
                </div>
            )}

            {/* Cards */}
            {items.length !== 0 && (
                <div
                    className="space-y-3 overflow-y-auto h-[calc(100vh-300px)]
                custom-scroll overflow-x-hidden p-2 pt-1"
                >
                    {items.map((item) => (
                        <CardItem key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

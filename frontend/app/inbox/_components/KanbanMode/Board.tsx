"use client";

import Column from "./Column";
import type { KanbanBoardData } from "../../_types/kanban";

interface BoardProps {
    columns: KanbanBoardData;
    activeColumn: string | null;
}

export default function Board({ columns, activeColumn }: BoardProps) {
    return (
        <div className="flex gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 overflow-x-auto">
            {Object.entries(columns).map(([colId, items]) => (
                <Column
                    key={colId}
                    columnId={colId}
                    items={items}
                    isActive={activeColumn === colId}
                />
            ))}
        </div>
    );
}

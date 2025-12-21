"use client";

import Column from "./Column";
import type { KanbanBoardData } from "../../_types/kanban";

interface BoardProps {
    board: KanbanBoardData;
    activeColumn: string | null;
}

export default function Board({ board, activeColumn }: BoardProps) {
    return (
        <div
            className="gap-2 p-2 pt-0 grid"
            style={{
                gridTemplateColumns: `repeat(${board.columns.length}, minmax(0, 1fr))`,
            }}
        >
            {board.columns.map((column) => (
                <Column
                    key={column.id}
                    column={column}
                    items={board.emails[column.id] ?? []}
                    isActive={activeColumn === column.id}
                />
            ))}
        </div>
    );
}

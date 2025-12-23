"use client";

import Column from "./Column";
import type { KanbanBoardData } from "../../_types/kanban";
import { SummaryModalProvider, useSummaryModal } from "./SummaryModalContext";
import SummaryModal from "./SummaryModal";

interface BoardProps {
    board: KanbanBoardData;
    activeColumn: string | null;
}

function BoardContent({ board, activeColumn }: BoardProps) {
    const { isOpen, data, closeModal } = useSummaryModal();

    return (
        <>
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

            {/* Single shared SummaryModal for all cards */}
            {data && (
                <SummaryModal
                    isOpen={isOpen}
                    onClose={closeModal}
                    emailId={data.emailId}
                    subject={data.subject}
                    from={data.from}
                    date={data.date}
                    currentSummary={data.currentSummary}
                />
            )}
        </>
    );
}

export default function Board({ board, activeColumn }: BoardProps) {
    return <BoardContent board={board} activeColumn={activeColumn} />;
}

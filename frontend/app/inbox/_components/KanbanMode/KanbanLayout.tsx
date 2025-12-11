"use client";
import KanbanWrapper from "./KanbanWrapper";
import useKanban from "../../hooks/useKanban";
import RefreshButton from "./RefreshButton";
function KanbanLayout() {
    const { columns, onDragEnd, isLoading, refetch, moveToColumnFromFrozen } =
        useKanban();
    return (
        <div className="relative kanban__layout h-screen w-full flex flex-col overflow-hidden text-white">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-linear-to-br from-[#0f111a] via-[#1a1b2b] to-[#2c1e4f] backdrop-blur-sm" />
            <div className="relative z-10">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                    </div>
                )}
                <RefreshButton onClick={refetch} />
                <KanbanWrapper
                    columns={columns}
                    onDragEnd={onDragEnd}
                    refetch={refetch}
                    moveToColumnFromFrozen={moveToColumnFromFrozen}
                ></KanbanWrapper>
            </div>
        </div>
    );
}

export default KanbanLayout;

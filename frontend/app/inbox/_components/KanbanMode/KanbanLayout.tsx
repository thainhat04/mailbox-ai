"use client";
import KanbanWrapper from "./KanbanWrapper";
import useKanban from "../../hooks/useKanban";
import RefreshButton from "./RefreshButton";
import FilterSortControls from "./FilterSortControls";
import ColumnManagerButton from "./ColumnManagerButton";

function KanbanLayout() {
    const {
        columns,
        onDragEnd,
        isLoading,
        refetch,
        moveToColumnFromFrozen,
        filters,
        setFilters,
        sortBy,
        setSortBy,
        createKanbanColumn,
        updateKanbanColumn,
        deleteKanbanColumn,
    } = useKanban();

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
                <div className="p-2 sm:p-3 md:p-4 pb-0">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
                                Kanban Board
                            </h1>
                        </div>
                        <div className="flex items-center gap-5">
                            <RefreshButton onClick={refetch} />
                            <ColumnManagerButton
                                onCreateColumn={createKanbanColumn}
                                onUpdateColumn={updateKanbanColumn}
                                onDeleteColumn={deleteKanbanColumn}
                            />
                        </div>
                    </div>
                    <FilterSortControls
                        onFilterChange={setFilters}
                        onSortChange={setSortBy}
                        currentFilters={filters}
                        currentSort={sortBy}
                    />
                </div>
                <KanbanWrapper
                    columns={columns}
                    onDragEnd={onDragEnd}
                    refetch={refetch}
                    moveToColumnFromFrozen={moveToColumnFromFrozen}
                />
            </div>
        </div>
    );
}

export default KanbanLayout;

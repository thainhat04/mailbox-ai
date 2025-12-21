import type { KanbanBoardData } from "../app/inbox/_types";
import constant from "../app/inbox/_constants";
export default function isFrozenColumn(
    board: KanbanBoardData,
    columnId: string
): boolean {
    return (
        board.columns.find((c) => c.id === columnId)?.key ===
        constant.FROZEN_COLUMN_KEY
    );
}

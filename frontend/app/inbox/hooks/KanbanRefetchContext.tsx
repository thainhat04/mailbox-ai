import { createContext, useContext } from "react";

export const KanbanRefetchContext = createContext<
    | {
          refetch: () => void;
          moveToColumnFromFrozen: (id: string) => Promise<void>;
      }
    | undefined
>(undefined);

export const useKanbanRefetch = () => {
    const ctx = useContext(KanbanRefetchContext);
    if (!ctx)
        throw new Error("useKanbanRefetch must be used inside KanbanProvider");
    return ctx;
};

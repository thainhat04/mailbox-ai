"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import inboxConstant from "../../_constants";
import { KanbanItem } from "../../_types";
import { useCountdown } from "../../hooks/useCountdown";
import { useKanbanRefetch } from "../../hooks/KanbanRefetchContext";
import { useEffect, useState } from "react";
import SummaryModal from "./SummaryModal";

interface CardItemProps {
    item: KanbanItem;
    isOverlay?: boolean;
}

export default function CardItem({ item, isOverlay }: CardItemProps) {
    const countdown = useCountdown(item.snoozedUntil);
    const { moveToInboxFromFrozen } = useKanbanRefetch();
    const isFrozen = item.kanbanStatus === inboxConstant.nameFrozenColumn;
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    let sortable = null;
    if (!isOverlay && !isFrozen) sortable = useSortable({ id: item.id });

    useEffect(() => {
        if (countdown === "Đã hết hạn") {
            setTimeout(() => {
                moveToInboxFromFrozen(item.id);
            }, 2000);
        }
    }, [countdown, moveToInboxFromFrozen]);

    const style =
        isOverlay || isFrozen
            ? {
                  transform: "",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                  opacity: 0.95,
              }
            : {
                  transform: CSS.Transform.toString(sortable!.transform),
                  transition: sortable!.transition,
                  opacity: sortable!.isDragging ? 0.5 : 1,
              };

    // Handle card click - but don't open modal while dragging
    const handleCardClick = (e: React.MouseEvent) => {
        if (!isDragging && !isOverlay && !isFrozen) {
            setIsSummaryOpen(true);
        }
    };

    return (
        <>
            <div
                ref={!isOverlay && !isFrozen ? sortable!.setNodeRef : undefined}
                style={style}
                {...(!isOverlay && !isFrozen
                    ? {
                          ...sortable!.attributes,
                          ...sortable!.listeners,
                          onMouseDown: () => setIsDragging(true),
                          onMouseUp: () => setIsDragging(false),
                      }
                    : {})}
                onClick={handleCardClick}
                className={`
        group relative mb-3 p-4 rounded-xl cursor-pointer 
        bg-white/10 border 
        ${
            sortable?.isOver
                ? "border-cyan-400 ring-1 ring-cyan-400"
                : "border-white/20"
        }
        transition-all duration-200 ease-out text-white/90
        hover:shadow-md hover:border-white/40 hover:bg-white/12
    `}
            >
                <div className="relative z-10 space-y-2">
                    {/* Subject */}
                    <h4 className="font-semibold text-sm text-white/95 mb-1 line-clamp-2">
                        {item.subject}
                    </h4>

                    {/* From */}
                    <p className="text-xs text-white/60">
                        From: <span className="text-white/75">{item.from}</span>
                    </p>

                    {/* AI Summary */}
                    {item.summary && (
                        <p className="text-xs text-cyan-300 font-medium line-clamp-2 cursor-pointer hover:text-cyan-200 transition-colors">
                            {item.summary}
                        </p>
                    )}

                    {/* Snippet */}
                    {item.snippet && (
                        <p className="text-xs text-white/60 line-clamp-2">
                            {item.snippet}
                        </p>
                    )}

                    {/* Snooze countdown */}
                    {item.snoozedUntil && countdown !== "Đã hết hạn" && (
                        <p className="text-xs mt-1 text-cyan-300 font-medium">
                            Snoozing: {countdown}
                        </p>
                    )}
                </div>

                {sortable?.isDragging && (
                    <div className="absolute inset-0 rounded-xl border-2 border-dashed border-cyan-400 animate-pulse" />
                )}
            </div>

            {/* Summary Modal */}
            <SummaryModal
                isOpen={isSummaryOpen}
                onClose={() => setIsSummaryOpen(false)}
                emailId={item.id}
                subject={item.subject}
                from={item.from}
                date={item.date}
                currentSummary={item.summary}
            />
        </>
    );
}

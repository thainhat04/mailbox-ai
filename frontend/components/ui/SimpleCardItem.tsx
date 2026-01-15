"use client";

import { useTranslation } from "react-i18next";

import { SearchEmail } from "@/app/inbox/_types";
import { formatEmailDate } from "@/helper/dateFormatter";

interface SimpleCardItemProps {
    item: SearchEmail;
    onClick: (item: SearchEmail) => void;
}

export default function SimpleCardItem({ item, onClick }: SimpleCardItemProps) {
    const { t } = useTranslation();
    return (
        <>
            <div
                onClick={() => onClick(item)}
                className={`
                    group relative mb-3 p-4 rounded-xl cursor-pointer
                    bg-white/10 border border-white/20
                    transition-all duration-200 ease-out text-white/90
                    hover:shadow-md hover:border-white/40 hover:bg-white/12
                `}
            >
                <div className="space-y-2">
                    {/* Subject */}
                    <h4 className="font-semibold text-sm text-white/95 line-clamp-2">
                        {item.subject}
                    </h4>

                    {/* From */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-white/60">
                            {t("card_item.1")}:{" "}
                            <span className="text-white/75">
                                {item.from.email}
                            </span>
                            {/* Timestamp */}
                        </p>
                        <span className="text-[10px] text-white/50">
                            {formatEmailDate(item.timestamp)}
                        </span>
                    </div>

                    {/* Snippet */}
                    {item.preview && (
                        <p className="text-xs text-white/60 line-clamp-2">
                            {item.preview}
                        </p>
                    )}
                    {/* Relevance Score */}
                    {item.relevanceScore && (
                        <p className="text-xs text-cyan-300 font-medium">
                            {t("card_item.2")}: {item.relevanceScore.toFixed(2)}
                        </p>
                    )}
                </div>
            </div>

            {/* Summary Modal */}
        </>
    );
}

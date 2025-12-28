"use client";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function RefreshButton({ onClick }: { onClick: () => void }) {
    const { t } = useTranslation();
    return (
        <button
            onClick={onClick}
            className="
                 rounded-lg 
                flex items-center gap-2 
               cursor-pointer
                text-white font-medium 
                transition-colors
            "
        >
            <RefreshCw className="h-4 w-4 animate-spin-slow" />
            {t("kanban.1")}
        </button>
    );
}

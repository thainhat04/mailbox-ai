"use client";

import { useState } from "react";
import { SortOption } from "../../_types/kanban";
import { Filter, SortAsc, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FilterSortControlsProps {
    onFilterChange: (filters: {
        unreadOnly: boolean;
        hasAttachmentsOnly: boolean;
        fromEmail: string;
    }) => void;
    onSortChange: (sort: SortOption) => void;
    currentFilters: {
        unreadOnly: boolean;
        hasAttachmentsOnly: boolean;
        fromEmail: string;
    };
    currentSort: SortOption;
}

export default function FilterSortControls({
    onFilterChange,
    onSortChange,
    currentFilters,
    currentSort,
}: FilterSortControlsProps) {
    const { t } = useTranslation();
    const [showFilters, setShowFilters] = useState(false);
    const [localFromEmail, setLocalFromEmail] = useState(
        currentFilters.fromEmail
    );

    const handleFilterToggle = (
        filterKey: "unreadOnly" | "hasAttachmentsOnly"
    ) => {
        onFilterChange({
            ...currentFilters,
            [filterKey]: !currentFilters[filterKey],
        });
    };

    const handleFromEmailChange = (email: string) => {
        setLocalFromEmail(email);

        if ((window as any).debounceTimeout) {
            clearTimeout((window as any).debounceTimeout);
        }

        (window as any).debounceTimeout = setTimeout(() => {
            onFilterChange({
                ...currentFilters,
                fromEmail: email,
            });
        }, 1000);
    };

    const clearFilters = () => {
        setLocalFromEmail("");
        onFilterChange({
            unreadOnly: false,
            hasAttachmentsOnly: false,
            fromEmail: "",
        });
    };

    const hasActiveFilters =
        currentFilters.unreadOnly ||
        currentFilters.hasAttachmentsOnly ||
        currentFilters.fromEmail;

    return (
        <div
            className={`bg-gray-800/50 border border-gray-700  p-2 ${
                showFilters ? "rounded-t-lg border-b-none" : "rounded-lg"
            } relative`}
        >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
                {/* Filter Toggle Button */}
                <div className="flex gap-1">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex cursor-pointer items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            hasActiveFilters
                                ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                                : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="text-xs sm:text-sm font-medium">
                            {t("filter.1")}{" "}
                            {hasActiveFilters && `(${t("filter.2")})`}
                        </span>
                    </button>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex cursor-pointer items-center justify-center gap-1 px-3 py-2 text-xs sm:text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                            <span className="hidden sm:inline">
                                {t("filter.7")}
                            </span>
                        </button>
                    )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                    <SortAsc className="w-4 h-4 text-gray-400 hidden sm:block" />
                    <select
                        value={currentSort}
                        onChange={(e) =>
                            onSortChange(e.target.value as SortOption)
                        }
                        className="bg-gray-700/50 text-gray-300 text-xs sm:text-sm px-2 sm:px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none cursor-pointer w-full sm:w-auto"
                    >
                        <option
                            value="date_desc"
                            className="bg-gray-800 text-gray-300 cursor-pointer"
                        >
                            {t("filter.date_desc")}
                        </option>
                        <option
                            value="date_asc"
                            className="bg-gray-800 text-gray-300 cursor-pointer"
                        >
                            {t("filter.date_asc")}
                        </option>
                        <option
                            value="sender"
                            className="bg-gray-800 text-gray-300 cursor-pointer"
                        >
                            {t("filter.sender")}
                        </option>
                    </select>
                </div>

                {/* Clear All Filters */}
            </div>

            {/* Expanded Filter Options */}
            {showFilters && (
                <div className="mt-2 pt-2 space-y-3 absolute bg-gray-800/90 rounded-b-lg p-3 z-20 left-0 right-0 border border-gray-700 border-t-0 mx-0">
                    {/* Toggle Filters */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleFilterToggle("unreadOnly")}
                            className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                                currentFilters.unreadOnly
                                    ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                                    : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600"
                            }`}
                        >
                            {currentFilters.unreadOnly ? "✓" : ""}{" "}
                            {t("filter.3")}
                        </button>

                        <button
                            onClick={() =>
                                handleFilterToggle("hasAttachmentsOnly")
                            }
                            className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                                currentFilters.hasAttachmentsOnly
                                    ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                                    : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600"
                            }`}
                        >
                            {currentFilters.hasAttachmentsOnly ? "✓" : ""}{" "}
                            {t("filter.4")}
                        </button>
                    </div>

                    {/* From Email Filter */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">
                            {t("filter.5")}
                        </label>
                        <input
                            type="text"
                            placeholder={t("filter.6")}
                            value={localFromEmail}
                            onChange={(e) =>
                                handleFromEmailChange(e.target.value)
                            }
                            className="w-full bg-gray-700/50 text-gray-300 text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

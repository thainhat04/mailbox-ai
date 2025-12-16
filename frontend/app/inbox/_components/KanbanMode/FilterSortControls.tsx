"use client";

import { useState } from "react";
import { SortOption } from "../../_types/kanban";
import { Filter, SortAsc, X } from "lucide-react";

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
    const [showFilters, setShowFilters] = useState(false);
    const [localFromEmail, setLocalFromEmail] = useState(
        currentFilters.fromEmail
    );

    const handleFilterToggle = (filterKey: "unreadOnly" | "hasAttachmentsOnly") => {
        onFilterChange({
            ...currentFilters,
            [filterKey]: !currentFilters[filterKey],
        });
    };

    const handleFromEmailChange = (email: string) => {
        setLocalFromEmail(email);
        onFilterChange({
            ...currentFilters,
            fromEmail: email,
        });
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
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 sm:p-3 mb-2 sm:mb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
                {/* Filter Toggle Button */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        hasActiveFilters
                            ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                            : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                    }`}
                >
                    <Filter className="w-4 h-4" />
                    <span className="text-xs sm:text-sm font-medium">
                        Filters {hasActiveFilters && `(Active)`}
                    </span>
                </button>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                    <SortAsc className="w-4 h-4 text-gray-400 hidden sm:block" />
                    <select
                        value={currentSort}
                        onChange={(e) => onSortChange(e.target.value as SortOption)}
                        className="bg-gray-700/50 text-gray-300 text-xs sm:text-sm px-2 sm:px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none cursor-pointer w-full sm:w-auto"
                    >
                        <option value="date_desc">Date: Newest First</option>
                        <option value="date_asc">Date: Oldest First</option>
                        <option value="sender">Sender (A-Z)</option>
                    </select>
                </div>

                {/* Clear All Filters */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-xs sm:text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">Clear</span>
                    </button>
                )}
            </div>

            {/* Expanded Filter Options */}
            {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                    {/* Toggle Filters */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleFilterToggle("unreadOnly")}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentFilters.unreadOnly
                                    ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                                    : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600"
                            }`}
                        >
                            {currentFilters.unreadOnly ? "✓" : ""} Show Only Unread
                        </button>

                        <button
                            onClick={() => handleFilterToggle("hasAttachmentsOnly")}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentFilters.hasAttachmentsOnly
                                    ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                                    : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600"
                            }`}
                        >
                            {currentFilters.hasAttachmentsOnly ? "✓" : ""} Has
                            Attachments
                        </button>
                    </div>

                    {/* From Email Filter */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">
                            Filter by Sender
                        </label>
                        <input
                            type="text"
                            placeholder="Enter sender email..."
                            value={localFromEmail}
                            onChange={(e) => handleFromEmailChange(e.target.value)}
                            className="w-full bg-gray-700/50 text-gray-300 text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

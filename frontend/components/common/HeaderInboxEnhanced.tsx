"use client";

import { useState, useRef, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { SuggestionItem, SuggestionType } from "@/types/suggestion";
import UserMenu from "@/components/ui/UserMenu";
import { User, Hash } from "lucide-react";
import { ModeSearch } from "@/app/inbox/_types";
import { useTranslation } from "react-i18next";
import { useSelector } from "@/store";

interface HeaderInboxProps {
    isCommondMode: boolean;
    setIsCommandMode: (mode: boolean) => void;
    onSearch: (query: string) => void;
    onModeChange: (mode: ModeSearch) => void;
    modeSearch: ModeSearch;
}

function HeaderInbox({
    isCommondMode,
    setIsCommandMode,
    onSearch,
    onModeChange,
    modeSearch,
}: HeaderInboxProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const accessToken = useSelector((state) => state.auth.accessToken);

    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Debounce search query
    const debouncedQuery = useDebounce(searchQuery, 300);

    // Fetch suggestions when debounced query changes
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (debouncedQuery.trim().length < 2) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            setIsLoadingSuggestions(true);
            try {
                const token = accessToken;
                const response = await fetch(
                    `${
                        process.env.NEXT_PUBLIC_API_BASE_URL
                    }/emails/suggestions?q=${encodeURIComponent(
                        debouncedQuery,
                    )}&limit=5`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );

                if (response.ok) {
                    const data = await response.json();
                    setSuggestions(data.data.suggestions || []);
                    setShowSuggestions(true);
                    setSelectedIndex(-1);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            } catch (error) {
                console.error("Failed to fetch suggestions:", error);
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsLoadingSuggestions(false);
            }
        };

        fetchSuggestions();
    }, [debouncedQuery, accessToken]);

    // Keyboard shortcut: Ctrl+K to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) {
            if (e.key === "Enter") {
                handleSearch(e);
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : prev,
                );
                break;

            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;

            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    selectSuggestion(suggestions[selectedIndex]);
                } else {
                    handleSearch(e);
                }
                break;

            case "Escape":
                e.preventDefault();
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
        }
    };

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
            suggestionRefs.current[selectedIndex]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
            });
        }
    }, [selectedIndex]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearch(searchQuery);
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }
    };

    const selectSuggestion = (suggestion: SuggestionItem) => {
        setSearchQuery(suggestion.value);
        onSearch(suggestion.value);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
    };

    const getSuggestionIcon = (type: SuggestionType) => {
        return type === SuggestionType.SENDER ? (
            <User className="w-4 h-4 text-cyan-400" />
        ) : (
            <Hash className="w-4 h-4 text-blue-400" />
        );
    };

    return (
        <header
            onClick={() => {
                const header_inbox = document.querySelector(
                    ".header_inbox",
                ) as HTMLElement;
                if (header_inbox) {
                    header_inbox.style.zIndex = "100";
                }
            }}
            className="sticky header_inbox top-0 z-1 border-b border-white/10 backdrop-blur-md bg-linear-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 py-3"
        >
            <div className="px-6 flex items-center justify-between gap-4">
                {/* Left: Logo + Brand */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-linear-to-br from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-cyan-500/30">
                        ✉️
                    </div>
                    <div className="hidden sm:flex flex-col">
                        <h1 className="font-bold text-lg leading-tight">
                            MailBox
                        </h1>
                        <p className="text-[11px] text-white/50 -mt-0.5">
                            Professional Email
                        </p>
                    </div>
                </div>
                <div className="flex-1 flex  justify-center gap-4 mx-15">
                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 shrink-0">
                        <button
                            type="button"
                            onClick={() => onModeChange("semantic")}
                            className={`px-3 cursor-pointer py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                                modeSearch === "semantic"
                                    ? "bg-linear-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 "
                                    : "hover:bg-white/5 text-white/60 hover:text-white/80"
                            }`}
                            title="AI-powered semantic search"
                        >
                            <span className="flex items-center gap-1.5">
                                <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                                Semantic
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onModeChange("fuzzy")}
                            className={`px-3 py-1.5 cursor-pointer rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                                modeSearch === "fuzzy"
                                    ? "bg-linear-to-r from-purple-500/30 to-pink-500/30 text-purple-300"
                                    : "hover:bg-white/5 text-white/60 hover:text-white/80"
                            }`}
                            title="Pattern-based fuzzy search"
                        >
                            <span className="flex items-center gap-1.5">
                                <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                                    />
                                </svg>
                                Fuzzy
                            </span>
                        </button>
                    </div>
                    {/* Center: Professional Search Box with Suggestions */}
                    <form
                        onSubmit={handleSearch}
                        className="hidden lg:flex flex-1 max-w-2xl relative"
                    >
                        <div
                            className={`relative w-full group transition-all duration-300 ${
                                isFocused ? "scale-[1.02]" : ""
                            }`}
                        >
                            <div
                                className={`absolute inset-0 bg-linear-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                                    isFocused ? "opacity-100" : ""
                                }`}
                            ></div>

                            <div
                                className={`relative flex items-center bg-white/5 border rounded-xl overflow-hidden transition-all duration-300 ${
                                    isFocused
                                        ? "border-cyan-400/50 bg-white/8 shadow-lg shadow-cyan-500/10"
                                        : "border-white/10 hover:border-white/20 hover:bg-white/7"
                                }`}
                            >
                                {/* Search Icon Button */}
                                <button
                                    type="submit"
                                    className="pl-4 pr-3 flex items-center transition-colors cursor-pointer"
                                    aria-label="Search"
                                >
                                    <svg
                                        className={`w-5 h-5 transition-colors duration-300 ${
                                            isFocused
                                                ? "text-cyan-400"
                                                : "text-white/40 hover:text-white/60"
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                </button>

                                {/* Input Field */}
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    onFocus={() => {
                                        setIsFocused(true);
                                        if (suggestions.length > 0) {
                                            setShowSuggestions(true);
                                        }
                                    }}
                                    onBlur={() => setIsFocused(false)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t("inbox_header.1")}
                                    className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                                    autoComplete="off"
                                />

                                {/* Loading Indicator */}
                                {isLoadingSuggestions && (
                                    <div className="px-3">
                                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}

                                {/* Clear Button */}
                                {searchQuery && !isLoadingSuggestions && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSuggestions([]);
                                            setShowSuggestions(false);
                                        }}
                                        className="px-2 cursor-pointer rounded-lg transition-colors p-2"
                                    >
                                        <svg
                                            className="w-4 h-4 text-white/40 hover:text-white/70"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                )}

                                {/* Keyboard Shortcut Hint */}
                                <div className="hidden xl:flex items-center gap-1 px-3 py-1 mr-2 bg-white/5 border border-white/10 rounded-lg">
                                    <kbd className="text-[10px] font-semibold text-white/50">
                                        Ctrl
                                    </kbd>

                                    <kbd className="text-[10px] font-semibold text-white/50">
                                        K
                                    </kbd>
                                </div>
                            </div>

                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div
                                    ref={dropdownRef}
                                    className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
                                >
                                    <div className="max-h-[300px] overflow-y-auto custom-scroll">
                                        {suggestions.map(
                                            (suggestion, index) => (
                                                <div
                                                    key={`${suggestion.type}-${suggestion.value}-${index}`}
                                                    ref={(el) => {
                                                        suggestionRefs.current[
                                                            index
                                                        ] = el;
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        selectSuggestion(
                                                            suggestion,
                                                        );
                                                    }}
                                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                                                        selectedIndex === index
                                                            ? "bg-cyan-500/20 border-l-2 border-cyan-400"
                                                            : "hover:bg-white/5 border-l-2 border-transparent"
                                                    }`}
                                                >
                                                    <div className="shrink-0">
                                                        {getSuggestionIcon(
                                                            suggestion.type,
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white truncate">
                                                            {suggestion.label}
                                                        </p>
                                                        <p className="text-xs text-white/40 truncate">
                                                            {suggestion.type ===
                                                            SuggestionType.SENDER
                                                                ? t(
                                                                      "inbox_header.2",
                                                                  )
                                                                : t(
                                                                      "inbox_header.3",
                                                                  )}
                                                        </p>
                                                    </div>
                                                    {selectedIndex ===
                                                        index && (
                                                        <kbd className="text-[10px] font-semibold text-cyan-400 px-2 py-1 bg-cyan-500/10 rounded">
                                                            Enter
                                                        </kbd>
                                                    )}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                    <div className="px-4 py-2 bg-slate-900/50 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30">
                                        <span>{t("inbox_header.4")}</span>
                                        <span>{t("inbox_header.5")}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* View Mode Toggle - Moved to right side */}
                <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 shrink-0">
                    <button
                        onClick={() => setIsCommandMode(true)}
                        className={`px-4 cursor-pointer py-1.5 rounded-md text-sm font-medium transition-all ${
                            isCommondMode
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "hover:bg-blue-500/20 text-white/70 hover:text-blue-400"
                        }`}
                    >
                        Common
                    </button>
                    <button
                        onClick={() => setIsCommandMode(false)}
                        className={`px-4 py-1.5 cursor-pointer rounded-md text-sm font-medium transition-all ${
                            !isCommondMode
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "hover:bg-blue-500/20 text-white/70 hover:text-blue-400"
                        }`}
                    >
                        Kanban
                    </button>
                </div>

                {/* Right: User Menu */}
                <div className="shrink-0">
                    <UserMenu isHideEmail={false} />
                </div>
            </div>

            {/* Mobile Search Button */}
            <div className="lg:hidden px-6 pb-3 pt-2">
                <form onSubmit={handleSearch} className="w-full relative">
                    <div
                        className={`relative w-full transition-all duration-300 ${
                            isFocused ? "scale-[1.01]" : ""
                        }`}
                    >
                        <div
                            className={`flex items-center bg-white/5 border rounded-xl overflow-hidden transition-all duration-300 ${
                                isFocused
                                    ? "border-cyan-400/50 bg-white/8"
                                    : "border-white/10"
                            }`}
                        >
                            <button
                                type="submit"
                                className="pl-3 pr-2 flex items-center hover:bg-white/5 transition-colors cursor-pointer"
                                aria-label="Search"
                            >
                                <svg
                                    className={`w-4 h-4 transition-colors duration-300 ${
                                        isFocused
                                            ? "text-cyan-400"
                                            : "text-white/40 hover:text-white/60"
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </button>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => {
                                    setIsFocused(true);
                                    if (suggestions.length > 0) {
                                        setShowSuggestions(true);
                                    }
                                }}
                                onBlur={() => setIsFocused(false)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search emails..."
                                className="flex-1 bg-transparent py-2 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                                autoComplete="off"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSuggestions([]);
                                        setShowSuggestions(false);
                                    }}
                                    className="px-2"
                                >
                                    <svg
                                        className="w-4 h-4 text-white/40"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Mobile Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div
                                ref={dropdownRef}
                                className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
                            >
                                <div className="max-h-[250px] overflow-y-auto">
                                    {suggestions.map((suggestion, index) => (
                                        <div
                                            key={`mobile-${suggestion.type}-${suggestion.value}-${index}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                selectSuggestion(suggestion);
                                            }}
                                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-0"
                                        >
                                            <div className="shrink-0">
                                                {getSuggestionIcon(
                                                    suggestion.type,
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">
                                                    {suggestion.label}
                                                </p>
                                                <p className="text-xs text-white/40 truncate">
                                                    {suggestion.type ===
                                                    SuggestionType.SENDER
                                                        ? "Sender"
                                                        : "Keyword"}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </header>
    );
}

export default HeaderInbox;

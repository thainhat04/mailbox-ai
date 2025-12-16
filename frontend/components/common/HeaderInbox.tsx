"use client";

import { useState, useRef, useEffect } from "react";
import UserMenu from "@/components/ui/UserMenu";
interface HeaderInboxProps {
    isCommondMode: boolean;
    setIsCommandMode: (mode: boolean) => void;
    onSearch: (query: string) => void;
}
function HeaderInbox({
    isCommondMode,
    setIsCommandMode,
    onSearch,
}: HeaderInboxProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearch(searchQuery);
        }
    };

    return (
        <header className="relative z-20 border-b border-white/10 backdrop-blur-md bg-linear-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 py-3">
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

                {/* Center: Professional Search Box */}
                <form
                    onSubmit={handleSearch}
                    className="hidden lg:flex flex-1 max-w-2xl"
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
                                className="pl-4 pr-3 flex items-center  transition-colors cursor-pointer"
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
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Search emails, contacts, or labels..."
                                className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                            />

                            {/* Clear Button */}
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="px-2 cursor-pointer  rounded-lg transition-colors p-2"
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
                                <span className="text-white/30">+</span>
                                <kbd className="text-[10px] font-semibold text-white/50">
                                    K
                                </kbd>
                            </div>
                        </div>
                    </div>
                </form>

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
                <form onSubmit={handleSearch} className="w-full">
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
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Search emails..."
                                className="flex-1 bg-transparent py-2 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
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
                    </div>
                </form>
            </div>
        </header>
    );
}

export default HeaderInbox;

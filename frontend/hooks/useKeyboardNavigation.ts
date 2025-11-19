"use client";

import { useEffect, useCallback } from "react";

interface KeyboardNavigationOptions {
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onEnter?: () => void;
    onDelete?: () => void;
    onEscape?: () => void;
    enabled?: boolean;
}

/**
 * Custom hook for keyboard navigation in email list
 * Supports: Arrow Up/Down for navigation, Enter to select, Delete to remove, Escape to clear
 */
export const useKeyboardNavigation = (options: KeyboardNavigationOptions) => {
    const {
        onArrowUp,
        onArrowDown,
        onEnter,
        onDelete,
        onEscape,
        enabled = true,
    } = options;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Prevent default only for keys we handle
            switch (event.key) {
                case "ArrowUp":
                    event.preventDefault();
                    onArrowUp?.();
                    break;
                case "ArrowDown":
                    event.preventDefault();
                    onArrowDown?.();
                    break;
                case "Enter":
                    // Only prevent default if focused on email list
                    if (
                        event.target instanceof HTMLElement &&
                        event.target.closest("[data-email-list]")
                    ) {
                        event.preventDefault();
                        onEnter?.();
                    }
                    break;
                case "Delete":
                case "Backspace":
                    // Only for delete action
                    if (
                        event.target instanceof HTMLElement &&
                        event.target.closest("[data-email-list]")
                    ) {
                        event.preventDefault();
                        onDelete?.();
                    }
                    break;
                case "Escape":
                    event.preventDefault();
                    onEscape?.();
                    break;
                default:
                    break;
            }
        },
        [onArrowUp, onArrowDown, onEnter, onDelete, onEscape, enabled]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
};

/**
 * Hook to manage keyboard focus for accessible navigation
 */
export const useKeyboardFocus = (index: number, total: number) => {
    const getNextIndex = (direction: "up" | "down"): number => {
        if (direction === "up") {
            return index === 0 ? total - 1 : index - 1;
        } else {
            return index === total - 1 ? 0 : index + 1;
        }
    };

    return { getNextIndex };
};

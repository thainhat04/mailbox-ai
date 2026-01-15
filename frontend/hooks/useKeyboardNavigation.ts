"use client";

import { useEffect, useCallback } from "react";

interface KeyboardNavigationOptions {
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onO?: () => void;
    onU?: () => void;
    onD?: () => void;

    // New keyboard shortcuts
    onJ?: () => void; // Next email (vi-style)
    onK?: () => void; // Previous email (vi-style)
    onS?: () => void; // Star/unstar
    onR?: () => void; // Reply
    onA?: () => void; // Reply all
    onF?: () => void; // Forward
    onC?: () => void; // Compose
    onSlash?: () => void; // Search
    onX?: () => void; // Select/deselect
    onShiftU?: () => void; // Mark as unread
    onE?: () => void; // Archive
    onHash?: () => void; // Delete
    onQuestion?: () => void; // Show help
    enabled?: boolean;
}

/**
 * Custom hook for keyboard navigation in email list
 * Supports:
 * - Arrow Up/Down, j/k for navigation
 * - Enter to open email
 * - s to star, r to reply, a to reply all, f to forward
 * - c to compose, x to select, shift+u to mark unread
 * - Delete/# to delete, e to archive, Escape to clear
 */
export const useKeyboardNavigation = (options: KeyboardNavigationOptions) => {
    const {
        onArrowUp,
        onArrowDown,
        onO,
        onU,
        onD,
        onJ,
        onK,
        onS,
        onR,
        onA,
        onF,
        onC,
        onSlash,
        onX,
        onShiftU,
        onE,
        onHash,
        onQuestion,
        enabled = true,
    } = options;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Don't trigger shortcuts when typing in input/textarea
            const target = event.target as HTMLElement;
            const isInputField =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;

            // Allow shortcuts except when in input fields (unless it's Escape)
            if (isInputField && event.key !== "Escape") return;

            const isShiftPressed = event.shiftKey;
            const isCtrlOrCmdPressed = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();
            if (isCtrlOrCmdPressed) return;
            // Prevent default only for keys we handle
            switch (key) {
                case "arrowup":
                    event.preventDefault();
                    onArrowUp?.();
                    break;
                case "arrowdown":
                    event.preventDefault();
                    onArrowDown?.();
                    break;
                case "j":
                    if (!isInputField) {
                        event.preventDefault();
                        onJ ? onJ() : onArrowDown?.();
                    }
                    break;
                case "k":
                    if (!isInputField) {
                        event.preventDefault();
                        onK ? onK() : onArrowUp?.();
                    }
                    break;
                case "o":
                    onO?.();
                    break;
                case "s":
                    if (!isInputField) {
                        event.preventDefault();
                        onS?.();
                    }
                    break;
                case "r":
                    if (!isInputField) {
                        event.preventDefault();
                        onR?.();
                    }
                    break;
                case "a":
                    if (!isInputField && !isShiftPressed) {
                        event.preventDefault();
                        onA?.();
                    }
                    break;
                case "f":
                    if (!isInputField) {
                        event.preventDefault();
                        onF?.();
                    }
                    break;
                case "c":
                    if (!isInputField) {
                        event.preventDefault();
                        onC?.();
                    }
                    break;
                case "d":
                    if (!isInputField) {
                        event.preventDefault();
                        onD?.();
                    }
                case "/":
                    if (!isInputField) {
                        event.preventDefault();
                        onSlash?.();
                    }
                    break;
                case "x":
                    if (!isInputField) {
                        event.preventDefault();
                        onX?.();
                    }
                    break;
                case "u":
                    if (!isInputField) {
                        event.preventDefault();
                        onU?.();
                    }
                    break;

                case "e":
                    if (!isInputField) {
                        event.preventDefault();
                        onE?.();
                    }
                    break;
                case "#":
                    if (!isInputField) {
                        event.preventDefault();
                        onHash?.();
                    }
                    break;
                case "?":
                    if (!isInputField) {
                        event.preventDefault();
                        onQuestion?.();
                    }
                    break;

                default:
                    break;
            }
        },
        [
            onArrowUp,
            onArrowDown,
            onO,
            onU,
            onD,
            onR,
            onJ,
            onK,
            onS,
            onR,
            onA,
            onF,
            onC,
            onSlash,
            onX,
            onShiftU,
            onE,
            onHash,
            onQuestion,
            enabled,
        ]
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

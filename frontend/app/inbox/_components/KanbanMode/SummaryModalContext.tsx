"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SummaryModalData {
    emailId: string;
    subject: string;
    from: string;
    date: string;
    currentSummary?: string;
}

interface SummaryModalContextType {
    isOpen: boolean;
    data: SummaryModalData | null;
    openModal: (data: SummaryModalData) => void;
    closeModal: () => void;
}

const SummaryModalContext = createContext<SummaryModalContextType | undefined>(
    undefined
);

export function SummaryModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<SummaryModalData | null>(null);

    const openModal = (modalData: SummaryModalData) => {
        setData(modalData);
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
        // Keep data for animation, clear after a delay
        setTimeout(() => setData(null), 300);
    };

    return (
        <SummaryModalContext.Provider
            value={{ isOpen, data, openModal, closeModal }}
        >
            {children}
        </SummaryModalContext.Provider>
    );
}

export function useSummaryModal() {
    const context = useContext(SummaryModalContext);
    if (!context) {
        throw new Error(
            "useSummaryModal must be used within SummaryModalProvider"
        );
    }
    return context;
}

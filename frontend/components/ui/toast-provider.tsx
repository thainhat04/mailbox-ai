"use client";
import {
    createContext,
    useContext,
    useState,
    ReactNode,
    useEffect,
} from "react";
import { toastManager } from "@/helper/toast/toast-manager";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
    duration: number;
}

interface ToastContextProps {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (
        message: string,
        type: ToastType = "info",
        duration: number = 3000
    ) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    };

    useEffect(() => {
        toastManager.register(showToast);
    }, []);

    const icons = {
        success: <CheckCircle className="text-green-400 w-5 h-5" />,
        error: <XCircle className="text-red-400 w-5 h-5" />,
        warning: <AlertTriangle className="text-yellow-400 w-5 h-5" />,
        info: <Info className="text-blue-400 w-5 h-5" />,
    };

    const colors = {
        success: "bg-green-500/15 border-green-500/30 text-green-200",
        error: "bg-red-500/15 border-red-500/30 text-red-200",
        warning: "bg-yellow-500/15 border-yellow-500/30 text-yellow-200",
        info: "bg-blue-500/15 border-blue-500/30 text-blue-200",
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            <div className="fixed top-5 right-5 z-9999 flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            min-w-60 px-4 py-3 rounded-xl border 
                            backdrop-blur-sm shadow-xl flex items-start gap-3
                            animate-toast-enter pointer-events-auto
                            ${colors[toast.type]}
                        `}
                    >
                        {icons[toast.type]}
                        <span className="font-medium text-sm">
                            {toast.message}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes toastEnter {
                    0% {
                        opacity: 0;
                        transform: translateX(40px) scale(0.95);
                    }
                    60% {
                        opacity: 1;
                        transform: translateX(0px) scale(1.03);
                    }
                    100% {
                        transform: translateX(0px) scale(1);
                    }
                }

                .animate-toast-enter {
                    animation: toastEnter 0.35s cubic-bezier(0.25, 1, 0.5, 1);
                }
            `}</style>
        </ToastContext.Provider>
    );
}

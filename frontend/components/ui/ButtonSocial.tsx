"use client";
import React from "react";
import clsx from "clsx";

interface OAuthButtonProps {
    text: string;
    iconUrl: string;
    className?: string;
    onClick?: () => void;
    isLoading?: boolean;
}

const OAuthButton: React.FC<OAuthButtonProps> = ({
    text,
    iconUrl,
    className,
    onClick,
    isLoading = false,
}) => {
    return (
        <button
            onClick={isLoading ? undefined : onClick}
            disabled={isLoading}
            aria-disabled={isLoading}
            aria-busy={isLoading}
            className={clsx(
                "cursor-pointer flex items-center justify-center gap-2 sm:gap-3 bg-[#3C2D5A] text-white font-medium py-2.5 sm:py-2 px-3 sm:px-4 rounded-md hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60 text-xs sm:text-sm lg:text-base whitespace-nowrap",
                className
            )}
        >
            <img
                src={iconUrl}
                alt={`${text} icon`}
                className="w-4 sm:w-5 h-4 sm:h-5 shrink-0"
            />
            <span>{text}</span>
        </button>
    );
};

export default OAuthButton;

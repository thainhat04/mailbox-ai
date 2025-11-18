"use client";
import React from "react";
import clsx from "clsx";

interface OAuthButtonProps {
    text: string;
    iconUrl: string;
    className?: string;
    onClick?: () => void;
}

const OAuthButton: React.FC<OAuthButtonProps> = ({
    text,
    iconUrl,
    className,
    onClick,
}) => {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "cursor-pointer flex items-center justify-center gap-3 bg-[#3C2D5A] text-white font-medium py-2 px-4 rounded-md hover:opacity-90 transition",
                className
            )}
        >
            <img src={iconUrl} alt={`${text} icon`} className="w-5 h-5" />
            <span>{text}</span>
        </button>
    );
};

export default OAuthButton;

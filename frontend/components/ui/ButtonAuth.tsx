import clsx from "clsx";

interface ButtonAuthProps {
    text: string;
    className?: string;
    isLoading?: boolean;
    onClick?: () => void;
}

const ButtonAuth = ({
    text,
    className,
    isLoading = false,
    onClick = () => {},
}: ButtonAuthProps) => {
    return (
        <button
            disabled={isLoading}
            onClick={!isLoading ? onClick : undefined}
            className={clsx(
                "relative flex items-center justify-center gap-2 bg-linear-to-r from-[#501794] to-[#3E70A1] text-white font-bold py-2 px-6 rounded-md transition-all cursor-pointer hover:opacity-90",
                isLoading && "opacity-60 cursor-not-allowed",
                className
            )}
        >
            {isLoading && (
                <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}

            <span>{text}</span>
        </button>
    );
};

export default ButtonAuth;

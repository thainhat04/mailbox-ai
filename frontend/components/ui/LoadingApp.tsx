function LoadingApp() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                gap: 16,
                background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
            }}
        >
            <img
                src="/vercel.svg" // thay đường dẫn nếu cần
                alt="App logo"
                color="black"
                style={{ width: 96, height: 96, objectFit: "contain" }}
            />
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                Mailbox AI
            </div>

            <svg
                width="48"
                height="48"
                viewBox="0 0 50 50"
                style={{ marginTop: 8 }}
            >
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="#e6eef8"
                    strokeWidth="5"
                />
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="31.4 31.4"
                >
                    <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 25 25"
                        to="360 25 25"
                        dur="1s"
                        repeatCount="indefinite"
                    />
                </circle>
            </svg>
        </div>
    );
}

export default LoadingApp;

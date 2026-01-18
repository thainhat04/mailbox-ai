import { useEffect, useRef } from "react";

function EmailBody({ htmlContent }: { htmlContent: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (iframeRef.current) {
            const iframe = iframeRef.current;
            const iframeDoc =
                iframe.contentDocument || iframe.contentWindow?.document;

            if (iframeDoc) {
                iframeDoc.open();
                iframeDoc.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <meta charset="utf-8">
                            <style>
                                body { margin: 0; padding: 16px; font-family: inherit; color: white }
                            </style>
                        </head>
                        <body>${htmlContent}</body>
                    </html>
                `);
                iframeDoc.close();
            }
        }
    }, [htmlContent]);

    return (
        <iframe
            ref={iframeRef}
            className="email-body-iframe"
            style={{
                width: "100%",
                border: "none",
                flex: 1,
            }}
            sandbox="allow-same-origin"
            title="Email content"
        />
    );
}

export default EmailBody;

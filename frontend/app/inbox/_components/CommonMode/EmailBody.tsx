function EmailBody({ htmlContent }: { htmlContent: string }) {
    return (
        <div
            className="email-body"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
}
export default EmailBody;

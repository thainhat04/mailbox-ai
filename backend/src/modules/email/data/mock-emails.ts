import { Email } from "../entities";

export const MOCK_EMAILS: Email[] = [
  // INBOX EMAILS
  {
    id: "e1",
    from: { name: "Sarah Chen", email: "sarah.chen@techcorp.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    cc: [{ name: "John Smith", email: "john.smith@techcorp.com" }],
    subject: "Q4 Project Roadmap Review - Action Required",
    body: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>Hi Team,</p>
        <p>I hope this email finds you well. I wanted to follow up on our Q4 project roadmap discussion from last week's meeting.</p>
        <p>We need to finalize the following items by <strong>Friday, November 22nd</strong>:</p>
        <ul>
          <li>Feature prioritization for the authentication module</li>
          <li>Resource allocation for the email dashboard implementation</li>
          <li>Timeline estimates for OAuth integration</li>
          <li>Testing strategy and QA requirements</li>
        </ul>
        <p>Please review the attached roadmap document and provide your feedback in the shared Google Doc by EOD Wednesday.</p>
        <p>Key questions to address:</p>
        <ol>
          <li>Do we have sufficient resources for parallel development?</li>
          <li>Are there any dependencies we haven't identified?</li>
          <li>What are the risks to our December 15th target launch date?</li>
        </ol>
        <p>Let's schedule a follow-up meeting for Thursday at 2 PM to discuss any concerns.</p>
        <p>Best regards,<br>Sarah Chen<br>Product Manager<br>TechCorp Inc.</p>
      </div>
    `,
    preview:
      "Hi Team, I hope this email finds you well. I wanted to follow up on our Q4 project roadmap discussion from last week's meeting. We need to finalize...",
    timestamp: "2024-11-18T09:30:00Z",
    isRead: false,
    isStarred: true,
    isImportant: true,
    mailboxId: "inbox",
    attachments: [
      {
        id: "att1",
        filename: "Q4_Roadmap_2024.pdf",
        size: 2458624,
        mimeType: "application/pdf",
        url: "/api/attachments/att1/download",
      },
    ],
    labels: ["work", "important"],
  },
  {
    id: "e2",
    from: { name: "GitHub", email: "noreply@github.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "[mailbox] Pull Request #127: Implement OAuth2 Google Sign-In",
    body: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <h2>Pull Request #127</h2>
        <p><strong>nhantrait</strong> wants to merge 8 commits into <code>main</code> from <code>feature/oauth-google</code></p>

        <h3>Changes</h3>
        <ul>
          <li>✅ Add Google OAuth2 configuration</li>
          <li>✅ Implement OIDC authentication flow</li>
          <li>✅ Add token refresh mechanism</li>
          <li>✅ Update authentication controller</li>
          <li>🔄 Add unit tests for OAuth service (in progress)</li>
        </ul>

        <h3>Conversation</h3>
        <p><strong>@sarahchen</strong> commented 2 hours ago:</p>
        <blockquote>Great work! The implementation looks solid. A few suggestions:<br>
        1. Can we add error handling for expired refresh tokens?<br>
        2. Consider adding rate limiting for the OAuth endpoints<br>
        3. Documentation for the callback URL setup would be helpful
        </blockquote>

        <p><strong>@johnsmith</strong> approved these changes 1 hour ago</p>

        <h3>Checks</h3>
        <p>✅ All checks have passed (4/4)</p>
        <ul>
          <li>✅ Continuous Integration - 3m 42s</li>
          <li>✅ Code Coverage - 2m 15s</li>
          <li>✅ Linting - 45s</li>
          <li>✅ Security Scan - 1m 30s</li>
        </ul>

        <p style="margin-top: 20px;">
          <a href="https://github.com/user/mailbox/pull/127" style="background: #2da44e; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px;">View Pull Request</a>
        </p>
      </div>
    `,
    preview:
      "nhantrait wants to merge 8 commits into main from feature/oauth-google. Changes include Google OAuth2 configuration, OIDC authentication flow...",
    timestamp: "2024-11-18T08:15:00Z",
    isRead: false,
    isStarred: false,
    isImportant: false,
    mailboxId: "inbox",
    labels: ["github", "development"],
  },
  {
    id: "e3",
    from: { name: "Marketing Team", email: "marketing@company.com" },
    to: [{ name: "All Staff", email: "all@company.com" }],
    subject: "New Brand Guidelines Released - Please Review",
    body: `
      <div style="font-family: Arial, sans-serif;">
        <h1 style="color: #2c3e50;">Brand Guidelines Update 2024</h1>
        <p>Dear Colleagues,</p>
        <p>We're excited to announce the release of our updated brand guidelines for 2024!</p>

        <h2>What's New:</h2>
        <ul>
          <li>🎨 Refreshed color palette with improved accessibility</li>
          <li>📝 New typography standards</li>
          <li>🖼️ Updated logo usage guidelines</li>
          <li>📱 Social media templates and best practices</li>
          <li>✉️ Email signature templates</li>
        </ul>

        <p>Please download the brand guidelines package and familiarize yourself with the new standards. All external communications should follow these guidelines starting December 1st.</p>

        <p><strong>Action Items:</strong></p>
        <ol>
          <li>Download and review the brand guidelines (attached)</li>
          <li>Update your email signature by November 25th</li>
          <li>Attend the brand workshop on November 28th (calendar invite sent separately)</li>
        </ol>

        <p>If you have any questions, please don't hesitate to reach out to the marketing team.</p>

        <p>Best,<br>Marketing Team</p>
      </div>
    `,
    preview:
      "Dear Colleagues, We're excited to announce the release of our updated brand guidelines for 2024! What's New: Refreshed color palette...",
    timestamp: "2024-11-18T07:45:00Z",
    isRead: true,
    isStarred: false,
    isImportant: false,
    mailboxId: "inbox",
    attachments: [
      {
        id: "att2",
        filename: "Brand_Guidelines_2024.pdf",
        size: 15728640,
        mimeType: "application/pdf",
        url: "/api/attachments/att2/download",
      },
      {
        id: "att3",
        filename: "Email_Signature_Template.html",
        size: 12288,
        mimeType: "text/html",
        url: "/api/attachments/att3/download",
      },
    ],
  },
  {
    id: "e4",
    from: { name: "AWS Notifications", email: "no-reply@aws.amazon.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "AWS Bill Alert: Your November usage is 85% of budget",
    body: `
      <div style="font-family: 'Amazon Ember', Arial, sans-serif;">
        <h2>AWS Billing Alert</h2>
        <p>Your AWS account usage for November 2024 has reached 85% of your configured budget.</p>

        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background: #f0f0f0;">
            <th style="padding: 10px; text-align: left;">Service</th>
            <th style="padding: 10px; text-align: right;">Current Cost</th>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">EC2 Instances</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">$342.50</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">RDS Database</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">$156.20</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">S3 Storage</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">$45.80</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">CloudFront</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">$28.30</td>
          </tr>
          <tr style="font-weight: bold;">
            <td style="padding: 10px;">Total</td>
            <td style="padding: 10px; text-align: right;">$572.80 / $675.00</td>
          </tr>
        </table>

        <p><strong>Recommendations:</strong></p>
        <ul>
          <li>Review EC2 instance utilization and consider rightsizing</li>
          <li>Enable S3 lifecycle policies for older objects</li>
          <li>Review and delete unused RDS snapshots</li>
        </ul>

        <p>
          <a href="https://console.aws.amazon.com/billing" style="background: #ff9900; color: white; padding: 10px 20px; text-decoration: none;">View Detailed Billing</a>
        </p>
      </div>
    `,
    preview:
      "Your AWS account usage for November 2024 has reached 85% of your configured budget. Current cost: $572.80 / $675.00...",
    timestamp: "2024-11-18T06:00:00Z",
    isRead: false,
    isStarred: true,
    isImportant: true,
    mailboxId: "inbox",
    labels: ["billing", "aws"],
  },
  {
    id: "e5",
    from: { name: "LinkedIn", email: "notifications@linkedin.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "You have 3 new connection requests",
    body: `
      <div style="font-family: Arial, sans-serif;">
        <h2>New Connection Requests</h2>

        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
          <h3>Emily Rodriguez</h3>
          <p><strong>Senior Frontend Developer at Microsoft</strong></p>
          <p>Emily and you both know John Smith and 12 others</p>
          <p style="color: #666;">Message: "Hi! I noticed we're both working on React authentication projects. Would love to connect and share insights!"</p>
        </div>

        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
          <h3>Michael Park</h3>
          <p><strong>Product Manager at Google</strong></p>
          <p>You share membership in Web Development Professionals group</p>
        </div>

        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
          <h3>Jessica Williams</h3>
          <p><strong>UX Designer at Apple</strong></p>
          <p>Jessica and you both know Sarah Chen and 8 others</p>
        </div>

        <p style="margin-top: 30px;">
          <a href="https://linkedin.com/mynetwork" style="background: #0077b5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View All Invitations</a>
        </p>
      </div>
    `,
    preview:
      "Emily Rodriguez (Senior Frontend Developer at Microsoft), Michael Park (Product Manager at Google), and Jessica Williams (UX Designer at Apple)...",
    timestamp: "2024-11-17T22:30:00Z",
    isRead: true,
    isStarred: false,
    isImportant: false,
    mailboxId: "inbox",
  },
  {
    id: "e6",
    from: { name: "Calendar", email: "calendar-notification@google.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "Reminder: Team Standup in 15 minutes",
    body: `
      <div style="font-family: 'Google Sans', Arial, sans-serif;">
        <h2>📅 Upcoming Event Reminder</h2>

        <div style="background: #e8f0fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Team Standup</h3>
          <p><strong>When:</strong> Today, November 18, 2024 at 10:00 AM - 10:30 AM (EST)</p>
          <p><strong>Where:</strong> Google Meet: <a href="https://meet.google.com/abc-defg-hij">meet.google.com/abc-defg-hij</a></p>

          <h4>Attendees (8):</h4>
          <ul>
            <li>Sarah Chen (Organizer)</li>
            <li>You</li>
            <li>John Smith</li>
            <li>Emily Rodriguez</li>
            <li>+4 more</li>
          </ul>

          <p><strong>Agenda:</strong></p>
          <ul>
            <li>Yesterday's accomplishments</li>
            <li>Today's priorities</li>
            <li>Blockers and dependencies</li>
            <li>Quick Q4 roadmap check-in</li>
          </ul>
        </div>

        <p>
          <a href="https://meet.google.com/abc-defg-hij" style="background: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-right: 10px;">Join Meeting</a>
          <a href="https://calendar.google.com" style="color: #1a73e8; text-decoration: none;">View in Calendar</a>
        </p>
      </div>
    `,
    preview:
      "Team Standup - Today at 10:00 AM - 10:30 AM (EST). Join via Google Meet: meet.google.com/abc-defg-hij...",
    timestamp: "2024-11-17T14:45:00Z",
    isRead: false,
    isStarred: false,
    isImportant: false,
    mailboxId: "inbox",
  },
  {
    id: "e7",
    from: { name: "Security Team", email: "security@company.com" },
    to: [{ name: "All Engineering", email: "engineering@company.com" }],
    subject: "[SECURITY] Critical: Update Dependencies - CVE-2024-12345",
    body: `
      <div style="font-family: monospace; background: #fff3cd; padding: 20px; border-left: 4px solid #ff9800;">
        <h2 style="color: #d32f2f;">⚠️ SECURITY ALERT - ACTION REQUIRED</h2>

        <p><strong>Severity:</strong> HIGH</p>
        <p><strong>CVE ID:</strong> CVE-2024-12345</p>
        <p><strong>Affected Package:</strong> jsonwebtoken &lt; 9.0.2</p>

        <h3>Description:</h3>
        <p>A critical vulnerability has been discovered in the jsonwebtoken library that could allow attackers to forge JWT tokens under certain conditions. This affects our authentication system.</p>

        <h3>Impact:</h3>
        <ul>
          <li>Potential unauthorized access to user accounts</li>
          <li>Token forgery vulnerability</li>
          <li>CVSS Score: 8.1 (HIGH)</li>
        </ul>

        <h3>Required Actions:</h3>
        <ol>
          <li><strong>IMMEDIATE:</strong> Update jsonwebtoken to version 9.0.2 or later</li>
          <li>Run <code>npm audit fix</code> in all affected projects</li>
          <li>Review and rotate all JWT secrets in production</li>
          <li>Monitor authentication logs for suspicious activity</li>
          <li>Confirm completion by replying to this email</li>
        </ol>

        <h3>Deadline:</h3>
        <p style="background: #ffebee; padding: 10px; border-left: 3px solid #d32f2f;">
          <strong>All updates must be completed by EOD November 19, 2024</strong>
        </p>

        <h3>Resources:</h3>
        <ul>
          <li><a href="https://nvd.nist.gov/vuln/detail/CVE-2024-12345">CVE Details</a></li>
          <li><a href="https://github.com/auth0/node-jsonwebtoken/security/advisories">Security Advisory</a></li>
          <li><a href="https://docs.company.com/security/update-guide">Internal Update Guide</a></li>
        </ul>

        <p>If you need assistance, please contact the security team immediately.</p>

        <p>—<br>Security Team<br>security@company.com</p>
      </div>
    `,
    preview:
      "⚠️ SECURITY ALERT - A critical vulnerability has been discovered in the jsonwebtoken library (CVE-2024-12345). IMMEDIATE action required...",
    timestamp: "2024-11-17T13:20:00Z",
    isRead: false,
    isStarred: true,
    isImportant: true,
    mailboxId: "inbox",
    labels: ["security", "urgent"],
  },
  {
    id: "e8",
    from: { name: "HR Department", email: "hr@company.com" },
    to: [{ name: "All Employees", email: "all@company.com" }],
    subject: "Reminder: Annual Performance Reviews - Schedule Your 1-on-1",
    body: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Annual Performance Review Cycle 2024</h2>

        <p>Dear Team,</p>

        <p>It's that time of year again! Our annual performance review cycle will begin on December 1st. This is a valuable opportunity to reflect on your achievements, discuss your career growth, and set goals for 2025.</p>

        <h3>Timeline:</h3>
        <ul>
          <li><strong>Nov 25 - Nov 29:</strong> Self-assessment submission period</li>
          <li><strong>Dec 1 - Dec 15:</strong> Manager 1-on-1 review meetings</li>
          <li><strong>Dec 16 - Dec 20:</strong> Finalize reviews and development plans</li>
        </ul>

        <h3>Action Items:</h3>
        <ol>
          <li><strong>Complete your self-assessment</strong> in the HR portal by November 29th</li>
          <li><strong>Schedule your 1-on-1</strong> with your manager (30-60 minutes)</li>
          <li><strong>Prepare examples</strong> of your key accomplishments from 2024</li>
          <li><strong>Think about your goals</strong> for professional development in 2025</li>
        </ol>

        <h3>Resources:</h3>
        <ul>
          <li><a href="https://hr.company.com/performance-review">HR Portal - Performance Reviews</a></li>
          <li><a href="https://docs.company.com/review-guide">Performance Review Guide</a></li>
          <li><a href="https://docs.company.com/goal-setting">Goal Setting Framework</a></li>
        </ul>

        <p>If you have any questions about the review process, please don't hesitate to reach out to HR or your manager.</p>

        <p>We appreciate all your hard work this year!</p>

        <p>Best regards,<br>Human Resources Department</p>
      </div>
    `,
    preview:
      "It's that time of year again! Our annual performance review cycle will begin on December 1st. Please complete your self-assessment by November 29th...",
    timestamp: "2024-11-17T11:00:00Z",
    isRead: true,
    isStarred: false,
    isImportant: false,
    mailboxId: "inbox",
  },
  {
    id: "e9",
    from: { name: "Stack Overflow", email: "noreply@stackoverflow.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject:
      "New answer to: How to implement OAuth2 refresh token rotation in NestJS?",
    body: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Someone answered your question</h2>

        <div style="background: #f8f9fa; padding: 20px; border-left: 3px solid #f48024; margin: 20px 0;">
          <h3>Your Question:</h3>
          <p><strong>How to implement OAuth2 refresh token rotation in NestJS?</strong></p>
          <p>I'm building an authentication system with NestJS and need to implement refresh token rotation for better security. What's the best practice?</p>
        </div>

        <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
          <p><strong>Alex Thompson</strong> answered (Score: 15)</p>

          <p>Here's a robust implementation for refresh token rotation in NestJS:</p>

          <pre style="background: #282c34; color: #abb2bf; padding: 15px; border-radius: 5px; overflow-x: auto;"><code>async refreshAccessToken(refreshToken: string) {
  // 1. Verify the refresh token
  const payload = await this.jwtService.verify(refreshToken);

  // 2. Check if token is in database and not revoked
  const storedToken = await this.findRefreshToken(payload.jti);
  if (!storedToken || storedToken.revoked) {
    throw new UnauthorizedException('Invalid refresh token');
  }

  // 3. Generate new access token AND new refresh token
  const newAccessToken = this.generateAccessToken(payload.sub);
  const newRefreshToken = this.generateRefreshToken(payload.sub);

  // 4. Revoke old refresh token (rotation)
  await this.revokeRefreshToken(payload.jti);

  // 5. Store new refresh token
  await this.storeRefreshToken(newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}</code></pre>

          <p><strong>Key points:</strong></p>
          <ul>
            <li>Always rotate refresh tokens (generate new one each time)</li>
            <li>Revoke old refresh token immediately after use</li>
            <li>Store tokens in database with revocation status</li>
            <li>Use JTI (JWT ID) to track individual tokens</li>
            <li>Implement token family detection for security</li>
          </ul>

          <p>This prevents token replay attacks and improves security significantly.</p>
        </div>

        <p>
          <a href="https://stackoverflow.com/questions/12345/oauth2-refresh-token-rotation" style="background: #f48024; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px;">View Full Discussion</a>
        </p>
      </div>
    `,
    preview:
      "Alex Thompson answered your question about OAuth2 refresh token rotation in NestJS. The answer includes code examples and best practices...",
    timestamp: "2024-11-17T09:15:00Z",
    isRead: true,
    isStarred: true,
    isImportant: false,
    mailboxId: "inbox",
    labels: ["stackoverflow", "development"],
  },
  {
    id: "e10",
    from: { name: "npm", email: "support@npmjs.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "Weekly package updates: 12 outdated packages in your projects",
    body: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif;">
        <h2>📦 Weekly Dependency Report</h2>

        <p>Hi there! We've detected 12 outdated packages in your projects.</p>

        <h3>High Priority Updates:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f0f0f0;">
            <th style="padding: 10px; text-align: left;">Package</th>
            <th style="padding: 10px;">Current</th>
            <th style="padding: 10px;">Latest</th>
            <th style="padding: 10px;">Type</th>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">@nestjs/core</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">10.2.0</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #cb3837; font-weight: bold;">10.3.1</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">Minor</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">react</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">18.2.0</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #cb3837; font-weight: bold;">18.3.0</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">Minor</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">typescript</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">5.2.2</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #cb3837; font-weight: bold;">5.3.3</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">Minor</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">prisma</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">5.6.0</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #cb3837; font-weight: bold;">5.7.1</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">Minor</td>
          </tr>
        </table>

        <h3>Low Priority (Patch Updates):</h3>
        <ul>
          <li>eslint: 8.52.0 → 8.53.0</li>
          <li>prettier: 3.0.3 → 3.1.0</li>
          <li>jest: 29.7.0 → 29.7.1</li>
          <li>@types/node: 20.8.10 → 20.9.0</li>
        </ul>

        <p><strong>Quick Update Commands:</strong></p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;"><code>npm update
npm outdated
npm audit fix</code></pre>

        <p>
          <a href="https://npmjs.com/dashboard" style="background: #cb3837; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px;">View Full Report</a>
        </p>
      </div>
    `,
    preview:
      "We've detected 12 outdated packages in your projects. High priority updates include @nestjs/core, react, typescript, and prisma...",
    timestamp: "2024-11-17T08:00:00Z",
    isRead: true,
    isStarred: false,
    isImportant: false,
    mailboxId: "inbox",
  },

  // SENT EMAILS
  {
    id: "e20",
    from: { name: "Me", email: "me@example.com" },
    to: [{ name: "Sarah Chen", email: "sarah.chen@techcorp.com" }],
    cc: [{ name: "John Smith", email: "john.smith@techcorp.com" }],
    subject: "Re: Q4 Project Roadmap Review - My Feedback",
    body: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>Hi Sarah,</p>
        <p>Thanks for sending over the Q4 roadmap. I've reviewed the document and added my comments. Overall, I think we're on the right track!</p>

        <p><strong>My feedback on your questions:</strong></p>

        <p><strong>1. Resource allocation:</strong><br>
        I believe we have sufficient resources for parallel development, but we should consider bringing in a contractor for the OAuth integration to keep us on schedule.</p>

        <p><strong>2. Dependencies:</strong><br>
        One dependency we should discuss - the email dashboard needs the authentication module to be at least 80% complete. We should ensure there's a clear handoff point.</p>

        <p><strong>3. Risks:</strong><br>
        Main risk is the OAuth provider approval process, which can take 2-3 weeks. I recommend we submit our Google OAuth application ASAP.</p>

        <p>I'm available for the Thursday meeting. Looking forward to discussing these points!</p>

        <p>Best,<br>Me</p>
      </div>
    `,
    preview:
      "Thanks for sending over the Q4 roadmap. I've reviewed the document and added my comments. Overall, I think we're on the right track...",
    timestamp: "2024-11-17T15:30:00Z",
    isRead: true,
    isStarred: false,
    isImportant: false,
    mailboxId: "sent",
  },
  {
    id: "e21",
    from: { name: "Me", email: "me@example.com" },
    to: [{ name: "Design Team", email: "design@company.com" }],
    subject: "Email Dashboard UI - Wireframe Review Request",
    body: `
      <div style="font-family: Arial, sans-serif;">
        <p>Hey Design Team,</p>

        <p>I'm working on the email dashboard implementation and wanted to get your input on the UI layout.</p>

        <p><strong>Current Plan:</strong></p>
        <ul>
          <li>3-column layout (mailboxes | email list | email detail)</li>
          <li>Responsive collapse on mobile to single-column view</li>
          <li>Gmail-inspired interaction patterns</li>
        </ul>

        <p><strong>Questions:</strong></p>
        <ol>
          <li>Should we use our existing design system components or create custom ones?</li>
          <li>What's the preferred approach for mobile navigation?</li>
          <li>Do we have accessibility guidelines for keyboard navigation?</li>
        </ol>

        <p>I've attached some rough wireframes. Would love to schedule a quick review session this week!</p>

        <p>Thanks!</p>
      </div>
    `,
    preview:
      "I'm working on the email dashboard implementation and wanted to get your input on the UI layout. I've attached some rough wireframes...",
    timestamp: "2024-11-16T14:20:00Z",
    isRead: true,
    isStarred: false,
    isImportant: false,
    mailboxId: "sent",
    attachments: [
      {
        id: "att10",
        filename: "dashboard_wireframes.fig",
        size: 524288,
        mimeType: "application/octet-stream",
        url: "/api/attachments/att10/download",
      },
    ],
  },

  // STARRED EMAILS
  {
    id: "e30",
    from: { name: "Tech Lead", email: "techlead@company.com" },
    to: [{ name: "Engineering Team", email: "engineering@company.com" }],
    subject: "New Authentication Architecture - Implementation Guide",
    body: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Authentication System Architecture v2.0</h2>

        <p>Team, after several discussions, we've finalized our new authentication architecture. This document outlines the implementation approach.</p>

        <h3>Key Components:</h3>
        <ol>
          <li><strong>JWT-based authentication</strong>
            <ul>
              <li>Access tokens (15 minutes expiry)</li>
              <li>Refresh tokens (7 days expiry with rotation)</li>
              <li>HttpOnly cookies for web clients</li>
            </ul>
          </li>
          <li><strong>OAuth2 Integration</strong>
            <ul>
              <li>Google Sign-In (priority 1)</li>
              <li>Microsoft SSO (priority 2)</li>
              <li>GitHub OAuth (future consideration)</li>
            </ul>
          </li>
          <li><strong>Security Features</strong>
            <ul>
              <li>Refresh token rotation</li>
              <li>Token family detection</li>
              <li>Rate limiting on auth endpoints</li>
              <li>Multi-device session management</li>
            </ul>
          </li>
        </ol>

        <h3>Implementation Timeline:</h3>
        <ul>
          <li>Week 1: Core JWT implementation</li>
          <li>Week 2: Google OAuth integration</li>
          <li>Week 3: Security hardening & testing</li>
          <li>Week 4: Documentation & deployment</li>
        </ul>

        <p>Please review the attached technical specification and let me know if you have any questions.</p>

        <p>—<br>Tech Lead</p>
      </div>
    `,
    preview:
      "After several discussions, we've finalized our new authentication architecture. This document outlines the implementation approach...",
    timestamp: "2024-11-15T10:00:00Z",
    isRead: true,
    isStarred: true,
    isImportant: true,
    mailboxId: "starred",
    attachments: [
      {
        id: "att20",
        filename: "Auth_Architecture_Spec.pdf",
        size: 3145728,
        mimeType: "application/pdf",
        url: "/api/attachments/att20/download",
      },
    ],
    labels: ["architecture", "important"],
  },

  // DRAFTS
  {
    id: "e40",
    from: { name: "Me", email: "me@example.com" },
    to: [{ name: "Team", email: "team@company.com" }],
    subject: "Draft: Weekly Status Update",
    body: `
      <div style="font-family: Arial, sans-serif;">
        <p>Hi Team,</p>

        <p><strong>This week's accomplishments:</strong></p>
        <ul>
          <li>Completed OAuth2 integration with Google</li>
          <li>Implemented refresh token rotation</li>
          <li>Fixed security vulnerabilities in JWT handling</li>
          <li>TODO: Add more details here</li>
        </ul>

        <p><strong>Next week's goals:</strong></p>
        <ul>
          <li>TODO: Fill this in</li>
        </ul>

        <p><strong>Blockers:</strong></p>
        <ul>
          <li>None at the moment</li>
        </ul>
      </div>
    `,
    preview:
      "This week's accomplishments: Completed OAuth2 integration with Google, Implemented refresh token rotation...",
    timestamp: "2024-11-18T09:00:00Z",
    isRead: true,
    isStarred: false,
    isImportant: false,
    mailboxId: "drafts",
  },

  // More INBOX emails to reach realistic count
  {
    id: "e11",
    from: { name: "Jira Notifications", email: "notifications@jira.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject:
      "[PROJ-456] Bug: Refresh token not rotating properly - Assigned to you",
    body: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Issue Update</h2>
        <p><strong>PROJ-456</strong> has been assigned to you by Sarah Chen</p>

        <h3>Bug: Refresh token not rotating properly</h3>
        <p><strong>Priority:</strong> High</p>
        <p><strong>Reporter:</strong> QA Team</p>
        <p><strong>Assignee:</strong> You</p>

        <h4>Description:</h4>
        <p>During testing, we noticed that the refresh token is not being rotated when a new access token is issued. This is a security concern.</p>

        <h4>Steps to Reproduce:</h4>
        <ol>
          <li>Login with valid credentials</li>
          <li>Wait for access token to expire</li>
          <li>Call /auth/refresh endpoint</li>
          <li>Observe that the same refresh token is returned</li>
        </ol>

        <h4>Expected Behavior:</h4>
        <p>A new refresh token should be generated and the old one should be revoked.</p>

        <p><a href="https://jira.company.com/browse/PROJ-456">View in Jira</a></p>
      </div>
    `,
    preview:
      "PROJ-456 has been assigned to you. Bug: Refresh token not rotating properly. Priority: High...",
    timestamp: "2024-11-16T16:30:00Z",
    isRead: false,
    isStarred: false,
    isImportant: true,
    mailboxId: "inbox",
    labels: ["jira", "bug"],
  },
  {
    id: "e12",
    from: { name: "Netlify", email: "notifications@netlify.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "Deploy succeeded: mailbox-frontend (Production)",
    body: `
      <div style="font-family: -apple-system, sans-serif;">
        <h2>✅ Deploy Successful</h2>

        <p><strong>Site:</strong> mailbox-frontend</p>
        <p><strong>Deploy ID:</strong> 6542a1b2c3d4e5f6a7b8c9d0</p>
        <p><strong>Branch:</strong> main</p>
        <p><strong>Build Time:</strong> 2m 34s</p>

        <h3>Deploy Summary:</h3>
        <ul>
          <li>✅ Build completed successfully</li>
          <li>✅ All tests passed (127/127)</li>
          <li>✅ Bundle size within limits (234 KB)</li>
          <li>✅ Lighthouse score: 98/100</li>
        </ul>

        <p><strong>Live URL:</strong> <a href="https://mailbox-frontend.netlify.app">https://mailbox-frontend.netlify.app</a></p>

        <p><a href="https://app.netlify.com/sites/mailbox-frontend/deploys/6542a1b2c3d4e5f6a7b8c9d0">View Deploy Details</a></p>
      </div>
    `,
    preview:
      "Deploy succeeded for mailbox-frontend (Production). Build time: 2m 34s. All tests passed. Lighthouse score: 98/100...",
    timestamp: "2024-11-16T12:15:00Z",
    isRead: true,
    isStarred: false,
    isImportant: false,
    mailboxId: "inbox",
  },
];

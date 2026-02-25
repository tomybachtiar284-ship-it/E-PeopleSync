const nodemailer = require('nodemailer');

// Helper to send email
async function sendApprovalEmail({
    to,
    employeeName,
    leaveType,
    startDate,
    endDate,
    reason,
    approvalLink
}) {
    console.log(`\n--- 📧 SIMULATED EMAIL TO: ${to} ---`);
    console.log(`Subject: [Approval Required] Leave Request - ${employeeName}`);
    console.log(`Content:
        Hello,
        A leave request from ${employeeName} requires your approval.
        
        Details:
        - Type: ${leaveType}
        - Period: ${startDate} to ${endDate}
        - Reason: ${reason}
        
        Please review and action this request here:
        ${approvalLink}
        
        --- End of Email ---
    `);

    // Actual Nodemailer logic (Requires .env configuration)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            await transporter.sendMail({
                from: `"E-PeopleSync HR" <${process.env.SMTP_USER}>`,
                to: to,
                subject: `[Approval Required] Leave Request - ${employeeName}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                        <h2 style="color: #2563eb;">Leave Approval Request</h2>
                        <p>Hello,</p>
                        <p><strong>${employeeName}</strong> has submitted a leave request that requires your attention.</p>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p><strong>Type:</strong> ${leaveType}</p>
                            <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
                            <p><strong>Reason:</strong> ${reason}</p>
                        </div>
                        <p>Please click the button below to review and take action (Approve/Reject):</p>
                        <a href="${approvalLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review Request</a>
                        <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This link is unique to this request and requires the employee's NID for verification.</p>
                    </div>
                `
            });
            console.log('✅ Actual email sent successfully.');
        } catch (err) {
            console.error('❌ Failed to send actual email:', err.message);
        }
    } else {
        console.log('ℹ️ SMTP not configured. Skipping actual email sending.');
    }
}

module.exports = { sendApprovalEmail };

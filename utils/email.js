const nodemailer = require('nodemailer');

// Create transporter (configure with your email service)
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Send email function
const sendEmail = async (to, subject, text, html = null) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text,
            html: html || text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};

// Send verification email
const sendVerificationEmail = async (email, token) => {
    const subject = 'Verify your ChessVoice account';
    const text = `Your verification code is: ${token}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">ChessVoice Account Verification</h2>
            <p>Thank you for signing up for ChessVoice!</p>
            <p>Your verification code is:</p>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <h1 style="color: #667eea; margin: 0; font-size: 2rem;">${token}</h1>
            </div>
            <p>This code will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
        </div>
    `;
    
    return await sendEmail(email, subject, text, html);
};

// Send password reset email
const sendPasswordResetEmail = async (email, token) => {
    const subject = 'Reset your ChessVoice password';
    const text = `Your password reset code is: ${token}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">ChessVoice Password Reset</h2>
            <p>You requested a password reset for your ChessVoice account.</p>
            <p>Your reset code is:</p>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <h1 style="color: #667eea; margin: 0; font-size: 2rem;">${token}</h1>
            </div>
            <p>This code will expire in 1 hour.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
        </div>
    `;
    
    return await sendEmail(email, subject, text, html);
};

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail
}; 
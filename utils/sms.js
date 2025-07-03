const twilio = require('twilio');

// Format phone number to E.164 format
const formatPhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, remove it
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    
    // If it doesn't start with + or country code, assume it's Indian (+91)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }
    
    // Add + prefix
    return '+' + cleaned;
};

// Initialize Twilio client
const createTwilioClient = () => {
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

// Send SMS function
const sendSMS = async (to, message) => {
    try {
        const client = createTwilioClient();
        const formattedNumber = formatPhoneNumber(to);
        
        console.log(`Sending SMS to: ${formattedNumber}`);
        
        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedNumber
        });

        console.log('SMS sent:', result.sid);
        return true;
    } catch (error) {
        console.error('SMS sending error:', error);
        return false;
    }
};

// Send verification SMS
const sendVerificationSMS = async (phoneNumber, code) => {
    const message = `Your ChessVoice verification code is: ${code}. This code will expire in 10 minutes.`;
    return await sendSMS(phoneNumber, message);
};

// Send password reset SMS
const sendPasswordResetSMS = async (phoneNumber, code) => {
    const message = `Your ChessVoice password reset code is: ${code}. This code will expire in 1 hour.`;
    return await sendSMS(phoneNumber, message);
};

module.exports = {
    sendSMS,
    sendVerificationSMS,
    sendPasswordResetSMS
}; 
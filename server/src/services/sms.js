import twilio from 'twilio';

let twilioClient = null;

function getTwilioClient() {
  if (!twilioClient && process.env.DEV_MODE !== 'true') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export async function sendOtpSms(phone, otp) {
  // Development mode - log to console
  if (process.env.DEV_MODE === 'true') {
    console.log(`\n📱 OTP for ${phone}: ${otp}\n`);
    return { success: true, dev: true };
  }
  
  // Production - send via Twilio
  try {
    const client = getTwilioClient();
    const message = await client.messages.create({
      body: `Your SplitCo verification code is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('SMS sending failed:', error.message);
    throw new Error('Failed to send SMS');
  }
}

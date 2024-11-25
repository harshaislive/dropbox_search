// Pre-generated 6-digit OTP codes
const OTP_CODES = Array.from({ length: 100 }, () => 
  Math.floor(100000 + Math.random() * 900000).toString()
);

// Store OTP data with expiry
interface OTPData {
  code: string;
  email: string;
  expiresAt: number;
}

const activeOTPs = new Map<string, OTPData>();

// Function to get a random OTP from pre-generated codes
export const generateOTP = (): string => {
  const randomIndex = Math.floor(Math.random() * OTP_CODES.length);
  return OTP_CODES[randomIndex];
};

// Function to validate OTP
export const validateOTP = (email: string, inputOTP: string): boolean => {
  const otpData = activeOTPs.get(email);
  
  if (!otpData) {
    return false;
  }

  // Check if OTP has expired
  if (Date.now() > otpData.expiresAt) {
    activeOTPs.delete(email);
    return false;
  }

  // Check if OTP matches
  if (otpData.code !== inputOTP) {
    return false;
  }

  // OTP is valid - remove it so it can't be reused
  activeOTPs.delete(email);
  return true;
};

// Function to send OTP via n8n webhook
export const sendOTPEmail = async (email: string, otp: string, username: string): Promise<void> => {
  try {
    // Store OTP with 10-minute expiry
    activeOTPs.set(email, {
      code: otp,
      email,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('N8N webhook URL not configured');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        username,
        otp,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send OTP email');
    }
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

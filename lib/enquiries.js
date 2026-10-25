export const ENQUIRY_TYPES = ['Customs clearance', 'Sea freight (FCL/LCL)', 'Air freight', 'Road transport', 'Rail logistics', 'Project cargo', 'Warehousing & storage', 'General enquiry'];

export function validateEnquiry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Please complete all fields.' };
  const data = {};
  for (const key of ['fullName', 'email', 'type', 'message']) {
    if (typeof input[key] !== 'string') return { error: 'Please complete all fields.' };
    data[key] = input[key].trim();
  }
  if (data.fullName.length < 2 || data.fullName.length > 120) return { error: 'Enter your full name (2–120 characters).' };
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: 'Enter a valid email address.' };
  if (!ENQUIRY_TYPES.includes(data.type)) return { error: 'Choose a shipment or enquiry type.' };
  if (data.message.length < 10 || data.message.length > 5000) return { error: 'Enter a message between 10 and 5,000 characters.' };
  return { data };
}

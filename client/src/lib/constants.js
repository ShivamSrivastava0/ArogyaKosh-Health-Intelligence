export const RELATIONS = {
  SELF: 'You', SPOUSE: 'Spouse', FATHER: 'Father', MOTHER: 'Mother', SON: 'Son', DAUGHTER: 'Daughter',
  GRANDFATHER: 'Grandfather', GRANDMOTHER: 'Grandmother', SIBLING: 'Sibling',
  FATHER_IN_LAW: 'Father-in-law', MOTHER_IN_LAW: 'Mother-in-law', OTHER: 'Other',
};
export const GENDERS = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const SEVERITIES = { MILD: 'Mild', MODERATE: 'Moderate', SEVERE: 'Severe' };
export const CONDITION_STATUS = { ACTIVE: 'Active', MANAGED: 'Managed', RESOLVED: 'Resolved' };
export const LIFESTYLE = {
  smoking: { NEVER: 'Never', FORMER: 'Quit', CURRENT: 'Smokes' },
  alcohol: { NEVER: 'Never', OCCASIONAL: 'Occasionally', REGULAR: 'Regularly' },
  activity: { SEDENTARY: 'Mostly sitting', LIGHT: 'Light', MODERATE: 'Moderate', ACTIVE: 'Very active' },
  diet: { VEGETARIAN: 'Vegetarian', EGGETARIAN: 'Eggetarian', NON_VEGETARIAN: 'Non-veg', VEGAN: 'Vegan' },
};

export const MED_FORMS = { TABLET: 'Tablet', CAPSULE: 'Capsule', SYRUP: 'Syrup', INJECTION: 'Injection', DROPS: 'Drops', INHALER: 'Inhaler', CREAM: 'Cream', SACHET: 'Sachet', OTHER: 'Other' };
export const MEAL_TIMING = { ANY: 'Any time', BEFORE_FOOD: 'Before food', AFTER_FOOD: 'After food', WITH_FOOD: 'With food', EMPTY_STOMACH: 'Empty stomach', BEDTIME: 'At bedtime' };
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const RECORD_CATEGORIES = {
  PRESCRIPTION: 'Prescription', LAB_REPORT: 'Lab report', IMAGING: 'Scan / X-ray', DISCHARGE_SUMMARY: 'Discharge summary',
  VACCINATION: 'Vaccination', INSURANCE: 'Insurance', ID_PROOF: 'ID proof', BILL: 'Bill / receipt', OTHER: 'Other',
};

export const REMINDER_TYPES = {
  APPOINTMENT: 'Doctor visit', CHECKUP: 'Health checkup', LAB_TEST: 'Lab test', DENTAL: 'Dental', EYE: 'Eye check', FOLLOW_UP: 'Follow-up', OTHER: 'Other',
};
export const REPEAT = { NONE: 'Does not repeat', MONTHLY: 'Every month', QUARTERLY: 'Every 3 months', HALF_YEARLY: 'Every 6 months', YEARLY: 'Every year' };
export const REPEAT_SHORT = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEARLY: '6-monthly', YEARLY: 'Yearly' };

export const EXPENSE_CATEGORIES = {
  CONSULTATION: 'Consultation', MEDICINES: 'Medicines', LAB_TESTS: 'Lab tests', HOSPITAL: 'Hospital', INSURANCE_PREMIUM: 'Insurance premium',
  DENTAL: 'Dental', EYE_CARE: 'Eye care', THERAPY: 'Therapy', EQUIPMENT: 'Equipment', OTHER: 'Other',
};
export const PAYMENT_MODES = { UPI: 'UPI', CARD: 'Card', CASH: 'Cash', NET_BANKING: 'Net banking', INSURANCE: 'Insurance / cashless', OTHER: 'Other' };

export const STATUS_TONE = { NORMAL: 'ok', BORDERLINE: 'warn', LOW: 'warn', HIGH: 'bad', CRITICAL: 'bad' };
export const STATUS_LABEL = { NORMAL: 'Normal', BORDERLINE: 'Borderline', LOW: 'Low', HIGH: 'High', CRITICAL: 'Critical' };

export const MEMBER_COLORS = ['lime', 'sky', 'peach', 'lilac', 'mint', 'sun', 'rose', 'sand'];

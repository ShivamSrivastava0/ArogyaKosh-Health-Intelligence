/**
 * Application Constants
 */

export const USER_ROLES = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
};

export const REPORT_CATEGORIES = {
  LAB_REPORT: 'LAB_REPORT',
  PRESCRIPTION: 'PRESCRIPTION',
  SCAN: 'SCAN',
  OTHER: 'OTHER',
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
export const RELATIONS = ['SELF', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'];

export const HEALTH_EVENT_TYPES = {
  CONSULTATION: 'CONSULTATION',
  SURGERY: 'SURGERY',
  VACCINATION: 'VACCINATION',
  TEST: 'TEST',
  OTHER: 'OTHER',
};

export const ALLERGY_SEVERITIES = ['MILD', 'MODERATE', 'SEVERE'];
export const MEDICINE_FREQUENCIES = ['1/day', '2/day', '3/day', '4/day', 'As needed'];
export const LIFESTYLE_OPTIONS = ['Active', 'Moderate', 'Sedentary'];

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

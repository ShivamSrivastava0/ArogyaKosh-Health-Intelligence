import { body } from 'express-validator';
import {
  BLOOD_GROUPS,
  GENDERS,
  ALLERGY_SEVERITIES,
  MEDICINE_FREQUENCIES,
  LIFESTYLE_OPTIONS,
  RELATIONS,
} from '../constants/index.js';

/**
 * Validation rules for POST /api/profile (create)
 */
export const createProfileValidator = [
  body('personalDetails')
    .optional()
    .isObject()
    .withMessage('personalDetails must be an object'),

  body('personalDetails.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('personalDetails.gender')
    .optional()
    .isIn(GENDERS)
    .withMessage(`Gender must be one of: ${GENDERS.join(', ')}`),

  body('personalDetails.bloodGroup')
    .optional()
    .isIn(BLOOD_GROUPS)
    .withMessage(`Blood group must be one of: ${BLOOD_GROUPS.join(', ')}`),

  body('personalDetails.height')
    .optional()
    .isFloat({ min: 30, max: 300 })
    .withMessage('Height must be between 30 and 300 cm'),

  body('personalDetails.weight')
    .optional()
    .isFloat({ min: 1, max: 500 })
    .withMessage('Weight must be between 1 and 500 kg'),
];

/**
 * Validation rules for PATCH /api/profile (update)
 * All fields are optional since it's a partial update
 */
export const updateProfileValidator = [
  body('personalDetails')
    .optional()
    .isObject()
    .withMessage('personalDetails must be an object'),

  body('personalDetails.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('personalDetails.gender')
    .optional()
    .isIn([...GENDERS, ''])
    .withMessage(`Gender must be one of: ${GENDERS.join(', ')}`),

  body('personalDetails.bloodGroup')
    .optional()
    .isIn([...BLOOD_GROUPS, ''])
    .withMessage(`Blood group must be one of: ${BLOOD_GROUPS.join(', ')}`),

  body('personalDetails.height')
    .optional({ nullable: true })
    .isFloat({ min: 30, max: 300 })
    .withMessage('Height must be between 30 and 300 cm'),

  body('personalDetails.weight')
    .optional({ nullable: true })
    .isFloat({ min: 1, max: 500 })
    .withMessage('Weight must be between 1 and 500 kg'),

  body('allergies')
    .optional()
    .isArray()
    .withMessage('Allergies must be an array'),

  body('allergies.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Allergy name is required'),

  body('allergies.*.severity')
    .optional()
    .isIn(ALLERGY_SEVERITIES)
    .withMessage(`Severity must be one of: ${ALLERGY_SEVERITIES.join(', ')}`),

  body('currentMedicines')
    .optional()
    .isArray()
    .withMessage('Current medicines must be an array'),

  body('currentMedicines.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Medicine name is required'),

  body('currentMedicines.*.frequency')
    .optional()
    .isIn(MEDICINE_FREQUENCIES)
    .withMessage(`Frequency must be one of: ${MEDICINE_FREQUENCIES.join(', ')}`),

  body('chronicDiseases')
    .optional()
    .isArray()
    .withMessage('Chronic diseases must be an array'),

  body('chronicDiseases.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Disease name is required'),

  body('chronicDiseases.*.status')
    .optional()
    .isIn(['Active', 'Managed', 'Resolved'])
    .withMessage('Status must be Active, Managed, or Resolved'),

  body('insurancePolicies')
    .optional()
    .isArray()
    .withMessage('Insurance policies must be an array'),

  body('emergencyContacts')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 emergency contacts allowed'),

  body('emergencyContacts.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact name is required'),

  body('emergencyContacts.*.phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact phone is required'),

  body('emergencyContacts.*.relation')
    .optional()
    .isIn(RELATIONS)
    .withMessage(`Relation must be one of: ${RELATIONS.join(', ')}`),

  body('lifestyle')
    .optional()
    .isObject()
    .withMessage('Lifestyle must be an object'),

  body('lifestyle.smoking')
    .optional()
    .isIn(['Never', 'Former', 'Current', ''])
    .withMessage('Invalid smoking status'),

  body('lifestyle.alcohol')
    .optional()
    .isIn(['Never', 'Occasional', 'Regular', ''])
    .withMessage('Invalid alcohol status'),

  body('lifestyle.exercise')
    .optional()
    .isIn([...LIFESTYLE_OPTIONS, ''])
    .withMessage(`Exercise must be one of: ${LIFESTYLE_OPTIONS.join(', ')}`),

  body('lifestyle.diet')
    .optional()
    .isIn(['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Other', ''])
    .withMessage('Invalid diet option'),

  body('lifestyle.sleepHours')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 24 })
    .withMessage('Sleep hours must be between 0 and 24'),
];

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

// ---------------------------------------------------------------------------
// Gemini Client Initialization
// ---------------------------------------------------------------------------
let genAI = null;
let model = null;

function getModel() {
  if (!model) {
    if (!env.gemini.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }
    genAI = new GoogleGenerativeAI(env.gemini.apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return model;
}

// ---------------------------------------------------------------------------
// 1. Parse a Medical Report
// ---------------------------------------------------------------------------
/**
 * Extracts structured data from a medical document (PDF or image).
 * Returns a JSON object with key findings, abnormal values, and diagnosis.
 *
 * @param {Buffer} fileBuffer - The file as a Buffer
 * @param {string} mimeType  - MIME type (application/pdf, image/jpeg, image/png)
 * @returns {Object} Parsed medical report summary
 */
export async function parseMedicalReport(fileBuffer, mimeType) {
  const gemini = getModel();

  const prompt = `You are a world-class medical report parser. Analyze the attached medical document and extract a comprehensive structured JSON summary.

RESPOND ONLY WITH VALID JSON. No markdown, no code blocks, no explanations outside the JSON.

Use this exact schema:
{
  "reportType": "string (e.g., CBC, Lipid Profile, Thyroid Panel, X-Ray, MRI, Prescription)",
  "patientName": "string or null",
  "reportDate": "string (ISO date) or null",
  "facilityName": "string or null",
  "doctorName": "string or null",
  "keyFindings": [
    {
      "parameter": "string",
      "value": "string",
      "unit": "string",
      "referenceRange": "string",
      "status": "NORMAL | HIGH | LOW | CRITICAL"
    }
  ],
  "abnormalValues": [
    {
      "parameter": "string",
      "value": "string",
      "status": "HIGH | LOW | CRITICAL",
      "clinicalSignificance": "string (brief explanation)"
    }
  ],
  "diagnosis": "string (overall impression or diagnosis if available)",
  "recommendations": ["string"],
  "summary": "string (2-3 sentence plain-language summary of the report)"
}

If a field cannot be determined from the document, set it to null or an empty array.
Focus on accuracy. Flag any values outside normal reference ranges.`;

  const filePart = {
    inlineData: {
      data: fileBuffer.toString('base64'),
      mimeType,
    },
  };

  const result = await gemini.generateContent([prompt, filePart]);
  const responseText = result.response.text();

  // Extract JSON from the response (handle if wrapped in markdown code blocks)
  let parsed;
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    // Return raw text if parsing fails
    parsed = { summary: responseText, parseError: true };
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// 2. Generate Health Insights & ArogyaScore
// ---------------------------------------------------------------------------
/**
 * Generates an overall health score and personalized insights.
 *
 * @param {Object} healthProfile - The user's HealthProfile document
 * @param {Array}  reports       - Recent MedicalReport summaries
 * @returns {Object} { arogyaScore, category, insights, recommendations }
 */
export async function generateHealthInsights(healthProfile, reports) {
  const gemini = getModel();

  const context = buildUserContext(healthProfile, reports);

  const prompt = `You are ArogyaKosh's AI Health Intelligence engine. Based on the following patient data, generate a comprehensive health assessment.

PATIENT DATA:
${context}

RESPOND ONLY WITH VALID JSON using this schema:
{
  "arogyaScore": number (0-100, representing overall health index),
  "category": "string (Excellent | Good | Fair | Needs Attention | At Risk)",
  "insights": [
    {
      "area": "string (e.g., Cardiovascular, Metabolic, Nutrition, Lifestyle)",
      "status": "GOOD | ATTENTION | WARNING",
      "summary": "string (1-2 sentence insight)"
    }
  ],
  "recommendations": [
    {
      "priority": "HIGH | MEDIUM | LOW",
      "category": "string",
      "action": "string (specific actionable recommendation)"
    }
  ],
  "riskFactors": ["string"],
  "overallSummary": "string (3-4 sentence overall health summary)"
}

Be evidence-based. Do not provide specific medical diagnoses. Focus on health trends and preventive recommendations.`;

  const result = await gemini.generateContent(prompt);
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    parsed = {
      arogyaScore: 70,
      category: 'Good',
      insights: [],
      recommendations: [],
      riskFactors: [],
      overallSummary: responseText,
    };
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// 3. Health Assistant Chat (RAG-style)
// ---------------------------------------------------------------------------
/**
 * Answers health queries using the user's medical context.
 *
 * @param {string} userMessage   - The user's query
 * @param {Object} healthProfile - HealthProfile doc
 * @param {Array}  reports       - Recent MedicalReport docs
 * @param {Array}  chatHistory   - Previous messages [{ role, parts }]
 * @returns {string} The AI response text
 */
export async function chatWithHealthAssistant(userMessage, healthProfile, reports, chatHistory = []) {
  const gemini = getModel();

  const context = buildUserContext(healthProfile, reports);

  const systemInstruction = `You are ArogyaKosh Health Assistant, an AI-powered health companion. You have access to the patient's health profile and recent medical reports.

PATIENT CONTEXT:
${context}

RULES:
1. Always reference the patient's actual data when answering questions.
2. Provide evidence-based health information.
3. NEVER diagnose conditions. Instead, say "Based on your data, it may be worth discussing X with your doctor."
4. If asked about medications, always recommend consulting a physician.
5. Use clear, simple language. Format your responses with markdown for readability.
6. If the question is unrelated to health, politely redirect.
7. Be empathetic, supportive, and professional.
8. When referencing specific report values, cite the parameter name and value.`;

  const chat = gemini.startChat({
    history: [
      { role: 'user', parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: `Understood. I have reviewed the patient context and will strictly follow these rules as the ArogyaKosh Health Assistant. How can I help you?` }] },
      ...chatHistory,
    ],
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

// ---------------------------------------------------------------------------
// 4. Generate Pre-Doctor Brief
// ---------------------------------------------------------------------------
/**
 * Generates a medical-grade brief tailored for physicians.
 *
 * @param {Object} healthProfile - HealthProfile doc
 * @param {Array}  reports       - Recent MedicalReport docs
 * @returns {Object} JSON structured brief
 */
export async function generateDoctorBrief(healthProfile, reports) {
  const gemini = getModel();
  const context = buildUserContext(healthProfile, reports);

  const prompt = `You are a clinical AI assistant preparing a "Pre-Doctor Brief" for an attending physician. Based on the patient data below, generate a highly clinical, medical-grade summary. Use professional medical terminology.

PATIENT DATA:
${context}

RESPOND ONLY WITH VALID JSON using this exact schema:
{
  "patientInfo": {
    "age": "string",
    "gender": "string",
    "bloodGroup": "string"
  },
  "criticalAlerts": ["string (e.g., severe allergies, critical lab values)"],
  "activeConditions": [
    {
      "condition": "string",
      "status": "string",
      "currentMedication": "string (relevant meds from their profile)"
    }
  ],
  "recentTestHighlights": [
    {
      "testName": "string",
      "date": "string",
      "keyFinding": "string"
    }
  ],
  "clinicalSummary": "string (A concise, 1-paragraph clinical handover summary)"
}

Ensure all arrays exist even if empty. Extract only from the provided data.`;

  const result = await gemini.generateContent(prompt);
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    parsed = {
      patientInfo: { age: 'Unknown', gender: 'Unknown', bloodGroup: 'Unknown' },
      criticalAlerts: [],
      activeConditions: [],
      recentTestHighlights: [],
      clinicalSummary: "Failed to generate AI brief.",
    };
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Helper: Build Context String
// ---------------------------------------------------------------------------
function buildUserContext(healthProfile, reports) {
  const parts = [];

  if (healthProfile) {
    const pd = healthProfile.personalDetails || {};
    parts.push(`PERSONAL DETAILS:`);
    if (pd.gender) parts.push(`  Gender: ${pd.gender}`);
    if (pd.dateOfBirth) parts.push(`  Date of Birth: ${new Date(pd.dateOfBirth).toLocaleDateString()}`);
    if (pd.bloodGroup) parts.push(`  Blood Group: ${pd.bloodGroup}`);
    if (pd.height) parts.push(`  Height: ${pd.height} cm`);
    if (pd.weight) parts.push(`  Weight: ${pd.weight} kg`);

    if (healthProfile.allergies?.length > 0) {
      parts.push(`\nALLERGIES: ${healthProfile.allergies.map(a => `${a.name} (${a.severity})`).join(', ')}`);
    }

    if (healthProfile.currentMedicines?.length > 0) {
      parts.push(`\nCURRENT MEDICINES:`);
      healthProfile.currentMedicines.forEach(m => {
        parts.push(`  - ${m.name} ${m.dosage} (${m.frequency})`);
      });
    }

    if (healthProfile.chronicDiseases?.length > 0) {
      parts.push(`\nCHRONIC CONDITIONS:`);
      healthProfile.chronicDiseases.forEach(d => {
        parts.push(`  - ${d.name} (${d.status})`);
      });
    }

    if (healthProfile.lifestyle) {
      const ls = healthProfile.lifestyle;
      parts.push(`\nLIFESTYLE:`);
      if (ls.smoking) parts.push(`  Smoking: ${ls.smoking}`);
      if (ls.alcohol) parts.push(`  Alcohol: ${ls.alcohol}`);
      if (ls.exercise) parts.push(`  Exercise: ${ls.exercise}`);
      if (ls.diet) parts.push(`  Diet: ${ls.diet}`);
      if (ls.sleepHours) parts.push(`  Sleep: ${ls.sleepHours} hrs/night`);
    }
  }

  if (reports?.length > 0) {
    parts.push(`\nRECENT MEDICAL REPORTS:`);
    reports.forEach((r, i) => {
      parts.push(`\n  Report ${i + 1}: ${r.title} (${new Date(r.reportDate).toLocaleDateString()})`);
      if (r.category) parts.push(`    Category: ${r.category}`);
      if (r.doctorName) parts.push(`    Doctor: ${r.doctorName}`);
      if (r.facilityName) parts.push(`    Facility: ${r.facilityName}`);
      if (r.summary) parts.push(`    Summary: ${r.summary}`);
      if (r.parsedData) {
        const pd = r.parsedData;
        if (pd.keyFindings?.length > 0) {
          parts.push(`    Key Findings:`);
          pd.keyFindings.forEach(f => {
            parts.push(`      - ${f.parameter}: ${f.value} ${f.unit || ''} (${f.status})`);
          });
        }
        if (pd.abnormalValues?.length > 0) {
          parts.push(`    ⚠️ Abnormal Values:`);
          pd.abnormalValues.forEach(a => {
            parts.push(`      - ${a.parameter}: ${a.value} — ${a.clinicalSignificance}`);
          });
        }
      }
    });
  }

  return parts.length > 0 ? parts.join('\n') : 'No health data available for this user yet.';
}

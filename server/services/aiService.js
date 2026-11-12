import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { VITALS, VITAL_TYPES } from '../data/vitals.js';

let client = null;
const getClient = () => {
  if (!env.gemini.apiKey) return null;
  if (!client) client = new GoogleGenerativeAI(env.gemini.apiKey);
  return client;
};

export const isAiEnabled = () => Boolean(env.gemini.apiKey);

const withTimeout = (promise, ms = 15000) =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('AI request timed out')), ms))]);

const parseJson = (text) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  return JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw);
};

export const SAFETY_RULES = `Rules you must always follow:
- You are a health organiser assistant, not a doctor. Never diagnose, never prescribe, never change doses.
- For anything that sounds urgent (chest pain, breathlessness, stroke signs, heavy bleeding, unconsciousness, suicidal thoughts) tell the user to call 112 / 108 immediately.
- Use the family's records provided below; if the answer is not in the records, say so plainly.
- Be concise: short paragraphs or bullets, plain language, Indian context (₹, Indian brand names are fine).`;

/**
 * Run fn(modelName); if the configured model is retired/unknown (404), retry
 * once on the moving "latest" alias and remember that choice.
 */
let activeModel = null;
const withModel = async (fn) => {
  const name = activeModel || env.gemini.model;
  try {
    return await fn(name);
  } catch (err) {
    const msg = err.message || '';
    const retired = /\b404\b|not found|no longer available/i.test(msg);
    if (retired && name !== env.gemini.fallbackModel) {
      console.warn(`[ai] model "${name}" unavailable, switching to ${env.gemini.fallbackModel}`);
      activeModel = env.gemini.fallbackModel;
      return fn(activeModel);
    }
    // Temporary overload: one retry on the lighter model, without remembering it.
    if (/\b(503|429)\b|overloaded|high demand|timed out/i.test(msg) && name !== env.gemini.liteModel) {
      console.warn(`[ai] "${name}" busy, retrying on ${env.gemini.liteModel}`);
      return fn(env.gemini.liteModel);
    }
    throw err;
  }
};

/** Multi-turn chat. history: [{ role: 'user'|'assistant', content }] */
export const chat = async ({ system, history = [], message }) => {
  const ai = getClient();
  if (!ai) return null;
  return withModel(async (name) => {
    const model = ai.getGenerativeModel({ model: name, systemInstruction: system });
    const session = model.startChat({
      history: history.slice(-10).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content).slice(0, 4000) }] })),
    });
    const result = await withTimeout(session.sendMessage(message));
    return result.response.text();
  });
};

export const generate = async (prompt, system) => {
  const ai = getClient();
  if (!ai) return null;
  return withModel(async (name) => {
    const model = ai.getGenerativeModel({ model: name, systemInstruction: system });
    const result = await withTimeout(model.generateContent(prompt));
    return result.response.text();
  });
};

/**
 * Read a lab report (PDF / image) and pull out values we can chart.
 * Returns { reportDate, facility, doctor, summary, values: [{ type, name, value, value2, unit }] }
 */
export const extractLabReport = async (buffer, mime) => {
  const ai = getClient();
  if (!ai) return null;
  const catalog = VITAL_TYPES.map((t) => `${t} = ${VITALS[t].label} (${VITALS[t].unit})`).join('\n');
  const prompt = `Extract data from this medical report. Respond with JSON only, no prose:
{
  "reportDate": "YYYY-MM-DD or null",
  "facility": "lab / hospital name or empty",
  "doctor": "referring doctor or empty",
  "summary": "2-3 sentence plain-language summary for the patient, mention anything outside the reference range",
  "values": [ { "type": "one of the codes below, or OTHER", "name": "test name as printed", "value": number, "value2": number|null, "unit": "unit as printed" } ]
}
Map tests to these codes when they match (convert units to the listed unit if needed; for blood pressure use value=systolic, value2=diastolic):
${catalog}`;
  const text = await withModel(async (name) => {
    const model = ai.getGenerativeModel({ model: name, generationConfig: { responseMimeType: 'application/json' } });
    const result = await withTimeout(model.generateContent([prompt, { inlineData: { data: buffer.toString('base64'), mimeType: mime } }]), 60000);
    return result.response.text();
  });
  const json = parseJson(text);
  json.values = (json.values || []).filter((v) => typeof v.value === 'number' && !Number.isNaN(v.value));
  return json;
};

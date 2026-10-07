import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { generateSafeDefaultPlan } from './src/utils/planValidator';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));

// Initialize Google GenAI client (server-side only)
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Model selection: gemini-3.1-flash-lite is fast, high quota, and reliable
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';

// ==========================================
// API 1: STRICT JSON CLEANING PLAN (LLM Decides, Code Executes)
// ==========================================
app.post('/api/ai-clean-plan', async (req, res) => {
  const { dataProfile } = req.body;
  try {
    if (!aiClient) {
      const fallbackPlan = generateSafeDefaultPlan(dataProfile?.columnNames || [], dataProfile);
      return res.status(200).json({
        usingFallback: true,
        message: 'No GEMINI_API_KEY configured on server; using deterministic rule-based plan.',
        plan: fallbackPlan,
      });
    }

    const prompt = `You are analyzing a spreadsheet structure. Do not modify the spreadsheet. Do not return spreadsheet data. Return ONLY a structured JSON cleaning plan.

DATA PROFILE:
${JSON.stringify(dataProfile, null, 2)}

INSTRUCTIONS & RULES:
1. Identify the actual header row (0-indexed). Look for title rows, blank rows, or metadata rows at the top.
2. Identify empty or redundant columns to drop in "drop_columns".
3. Identify columns needing fill-down in "fill_down_columns" (if headers/categories are merged or sparse).
4. Identify structural non-data rows (e.g. metadata banners, notes, or footer rows) in "remove_rows_containing".
   CRITICAL: Do NOT remove rows containing TOTAL or SUBTOTAL. Those are summary rows and must be preserved!
5. Suggest clean, trimmed column renames in "rename" (e.g. removing extra spaces, trailing colons).
6. List columns that contain numeric data, currency symbols, or percentages in "numeric_columns" (e.g. "Qty", "Unit Price", "Revenue", "$1,200", "480000").
7. List columns that contain date values in "date_columns" (e.g. "OrderDate", "02/05/2026", "Monday, February 9, 2026", "March 20, 2026").
8. List columns containing boolean/active indicators in "boolean_columns" (e.g. "Active_Status", "Is_Verified").
9. For text/category/product columns with mixed casing (e.g., 'laptop' vs 'Laptop', 'retail' vs 'Retail'), specify target casing in "casing_standardizations" with "title", "upper", or "lower". For instance, if Product has 'laptop' and 'Laptop', set "Product": "title".
10. Set "replace_null_representations" to true if placeholder strings like "N/A", "null", "none", or "-" appear in data cells.
11. Identify obvious category, month, and region equivalences in "category_maps":
   - For Month values: map clearly equivalent variations and abbreviations consistently (e.g. "February", "Feb" -> "Feb"; "Mar.", "March", "Mar" -> "Mar"; "January", "Jan" -> "Jan").
   - For Region / Categories with obvious typos or abbreviations where the dataset provides strong evidence (e.g. "Wst" alongside "West" in Region): map "wst" -> "West".
   - For ambiguous values like "JM", DO NOT guess or map them! Leave them unmapped.
12. Set "remove_duplicates" to true (or false if exact duplicate rows should remain).
13. List observations in "notes":
   - Explicitly document preserved unusual values (e.g. "High Revenue value of $480,000 left unchanged as it may be a valid enterprise order.", "Negative Qty value of -1 left unchanged as it may represent a product return.").
   - Explicitly document summary rows (e.g. "Summary TOTAL row detected and preserved.").
   NEVER use the word "outlier". Use plain English.
14. Return ONLY valid JSON matching this schema:
{
  "header_row": 0,
  "drop_columns": [],
  "fill_down_columns": [],
  "remove_rows_containing": [],
  "rename": {},
  "numeric_columns": [],
  "date_columns": [],
  "boolean_columns": [],
  "casing_standardizations": {},
  "replace_null_representations": true,
  "category_maps": {},
  "remove_duplicates": true,
  "notes": []
}`;

    let response;
    try {
      response = await aiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (err: any) {
      console.warn(`Primary model ${GEMINI_MODEL} failed, attempting ${FALLBACK_MODEL}:`, err?.message || err);
      response = await aiClient.models.generateContent({
        model: FALLBACK_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const planText = response.text || '{}';
    const parsedPlan = JSON.parse(planText);

    res.json({
      usingFallback: false,
      plan: parsedPlan,
    });
  } catch (error: any) {
    const isQuota =
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.status === 429;

    if (isQuota) {
      console.warn('Gemini API quota reached (429); serving grounded deterministic cleaning plan.');
    } else {
      console.warn('Notice from /api/ai-clean-plan:', error?.message || error);
    }

    const fallbackPlan = generateSafeDefaultPlan(dataProfile?.columnNames || [], dataProfile);
    res.json({
      usingFallback: true,
      isQuotaExceeded: isQuota,
      message: isQuota
        ? 'Gemini quota limit reached. Deterministic engine generated the safe cleaning plan.'
        : 'Generated deterministic cleaning plan.',
      plan: fallbackPlan,
    });
  }
});

// Backward compatibility alias
app.post('/api/ai-analyze-dataset', async (req, res) => {
  const { dataProfile, structureReport, columnProfiles } = req.body;
  req.body.dataProfile = dataProfile || { structureReport, columnProfiles };
  // Delegate to ai-clean-plan
  const forwardReq = { body: { dataProfile: req.body.dataProfile } } as any;
  app._router.handle(
    Object.assign(req, { url: '/api/ai-clean-plan', originalUrl: '/api/ai-clean-plan' }),
    res,
    () => {}
  );
});

// ==========================================
// API 2: CONVERSATIONAL ASSISTANT INSTRUCTION
// ==========================================
app.post('/api/ai-chat-instruction', async (req, res) => {
  try {
    const { userInstruction, columns, sampleRows } = req.body;

    if (!aiClient) {
      return res.status(200).json({
        usingFallback: true,
        message: 'No GEMINI_API_KEY configured; fallback to local pattern interpreter.',
        operation: null,
      });
    }

    const prompt = `You are a conversational spreadsheet data assistant.
The user wants to perform an operation on their spreadsheet.
Translate their natural language request into a single structured operation that our deterministic processing engine can execute and validate.

AVAILABLE COLUMNS:
${JSON.stringify(columns)}

SAMPLE ROWS (first 3):
${JSON.stringify(sampleRows, null, 2)}

USER INSTRUCTION:
"${userInstruction}"

SUPPORTED OPERATION TYPES:
1. "standardize_column": { "column": string, "format": "MMM" | "Title Case" | "UPPER" | "lower" | "YYYY-MM-DD" | "DD-MM-YYYY" }
2. "replace_values": { "column": string, "from": string, "to": string }
3. "fill_missing": { "column": string, "value": string | number }
4. "remove_rows": { "column": string, "condition": "equals" | "empty", "value": any }
5. "combine_columns": { "columns": string[], "new_column": string, "separator": string }
6. "split_column": { "column": string, "delimiter": string, "new_columns": string[] }
7. "create_calculated_column": { "new_column": string, "formula": string, "left": string, "operator": "+" | "-" | "*" | "/", "right": string | number }
8. "rename_column": { "old_name": string, "new_name": string }
9. "remove_column": { "column": string }

RULES:
- Do NOT directly modify values. Output only the structured JSON command.
- If the instruction is ambiguous (e.g. asking to change an unclear code without specifying target), mark "is_ambiguous": true and explain in "clarification_needed".

Respond ONLY with valid JSON:
{
  "understood_intent": "Brief plain English statement of what user wants",
  "operation_type": string,
  "parameters": object,
  "is_ambiguous": boolean,
  "clarification_needed": string | null
}`;

    let response;
    try {
      response = await aiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (err: any) {
      console.warn(`Primary chat model ${GEMINI_MODEL} failed, attempting ${FALLBACK_MODEL}:`, err?.message || err);
      response = await aiClient.models.generateContent({
        model: FALLBACK_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const parsedOp = JSON.parse(response.text || '{}');
    res.json({
      usingFallback: false,
      operation: parsedOp,
    });
  } catch (error: any) {
    const isQuota =
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.status === 429;

    if (isQuota) {
      console.warn('Gemini chat instruction quota reached (429); falling back to local deterministic pattern matcher.');
    } else {
      console.warn('Notice from /api/ai-chat-instruction:', error?.message || error);
    }

    res.json({
      usingFallback: true,
      isQuotaExceeded: isQuota,
      message: 'Using grounded local semantic interpreter.',
      operation: null,
    });
  }
});

// Vite middleware mounting in dev
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET') return next();
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AI Data Workspace full-stack server running on http://0.0.0.0:${port}`);
  });
}

startServer();

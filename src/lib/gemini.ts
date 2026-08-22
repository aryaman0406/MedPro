import { GoogleGenAI } from "@google/genai";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PreVisitSummarySchema,
  type PreVisitSummaryData,
  PostVisitSummarySchema,
  type PostVisitSummaryData,
} from "@/lib/validations/ai";

// Initialize Gemini Client
const defaultModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function getGeminiClient(): GoogleGenAI | null {
  const currentKey = process.env.GEMINI_API_KEY;
  if (!currentKey || currentKey.trim() === "") {
    console.warn("⚠️ GEMINI_API_KEY is not set or empty. Gemini AI features will fall back gracefully.");
    return null;
  }
  return new GoogleGenAI({ apiKey: currentKey.trim() });
}

/**
 * 1. Pre-Visit Summary Generator
 * Prompt: "Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"
 */
export async function generatePreVisitSummary(
  symptomText: string
): Promise<{ success: true; data: PreVisitSummaryData } | { success: false; error: string }> {
  if (!symptomText || symptomText.trim() === "") {
    return { success: false, error: "No symptom description provided." };
  }

  const promptText = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptomText.trim()}

Respond ONLY with a valid JSON object matching this schema:
{
  "urgency": "Low" | "Medium" | "High",
  "chiefComplaint": "string",
  "suggestedQuestions": ["string", "string", "string"]
}`;

  let attempts = 0;
  let lastError = "Unknown error";

  while (attempts < 2) {
    attempts++;
    try {
      const client = getGeminiClient();
      if (!client) {
        throw new Error("GEMINI_API_KEY is missing or invalid");
      }

      const response = await client.models.generateContent({
        model: defaultModel,
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              urgency: {
                type: "string",
                enum: ["Low", "Medium", "High"],
              },
              chiefComplaint: {
                type: "string",
              },
              suggestedQuestions: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
            required: ["urgency", "chiefComplaint", "suggestedQuestions"],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error("Empty response received from Gemini API");
      }

      // Parse JSON
      let parsedJson: unknown;
      try {
        const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
        parsedJson = JSON.parse(cleanedText);
      } catch (parseErr) {
        throw new Error(`Invalid JSON output from model: ${(parseErr as Error).message}`);
      }

      // Validate with Zod
      const validated = PreVisitSummarySchema.safeParse(parsedJson);
      if (!validated.success) {
        throw new Error(`Schema validation failed: ${validated.error.message}`);
      }

      const data: PreVisitSummaryData = {
        urgency: validated.data.urgency,
        chiefComplaint: validated.data.chiefComplaint,
        suggestedQuestions: validated.data.suggestedQuestions.slice(0, 3),
      };

      return { success: true, data };
    } catch (err) {
      lastError = (err as Error)?.message || "Failed to generate AI summary";
      console.warn(`[Gemini Pre-Visit Summary] Attempt ${attempts}/2 failed: ${lastError}`);

      if (attempts < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  return { success: false, error: lastError };
}

/**
 * 2. Post-Visit Summary Generator
 * Prompt: "Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes + structured prescription>"
 */
export async function generatePostVisitSummary(
  notes: string,
  prescriptionJson?: unknown
): Promise<{ success: true; data: PostVisitSummaryData } | { success: false; error: string }> {
  const combinedContext = `Clinical Notes:
${notes || "No clinical notes provided."}

Prescription Details:
${prescriptionJson ? JSON.stringify(prescriptionJson, null, 2) : "No prescription provided."}`;

  const promptText = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${combinedContext}

Respond ONLY with a valid JSON object matching this schema:
{
  "plainSummary": "A warm, patient-friendly summary explaining the diagnosis, findings, and general care advice in simple language",
  "medicationSchedule": [
    {
      "medicine": "Medicine Name and dosage",
      "whenToTake": "Detailed instructions on timing, frequency, and with/without food",
      "durationDays": 2
    }
  ],
  "followUpSteps": [
    "Clear actionable next step for the patient"
  ]
}`;

  let attempts = 0;
  let lastError = "Unknown error";

  while (attempts < 2) {
    attempts++;
    try {
      const client = getGeminiClient();
      if (!client) {
        throw new Error("GEMINI_API_KEY is missing or invalid");
      }

      const response = await client.models.generateContent({
        model: defaultModel,
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              plainSummary: {
                type: "string",
              },
              medicationSchedule: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    medicine: { type: "string" },
                    whenToTake: { type: "string" },
                    durationDays: { type: "number" },
                  },
                  required: ["medicine", "whenToTake", "durationDays"],
                },
              },
              followUpSteps: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
            required: ["plainSummary", "medicationSchedule", "followUpSteps"],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error("Empty response received from Gemini API");
      }

      let parsedJson: unknown;
      try {
        const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
        parsedJson = JSON.parse(cleanedText);
      } catch (parseErr) {
        throw new Error(`Invalid JSON output from model: ${(parseErr as Error).message}`);
      }

      const validated = PostVisitSummarySchema.safeParse(parsedJson);
      if (!validated.success) {
        throw new Error(`Schema validation failed: ${validated.error.message}`);
      }

      return { success: true, data: validated.data };
    } catch (err) {
      lastError = (err as Error)?.message || "Failed to generate post-visit AI summary";
      console.warn(`[Gemini Post-Visit Summary] Attempt ${attempts}/2 failed: ${lastError}`);

      if (attempts < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  return { success: false, error: lastError };
}

/**
 * Process Pre-Visit Summary onto an Appointment record
 */
export async function processAppointmentPreVisitSummary(
  appointmentId: string,
  symptomText: string
): Promise<void> {
  try {
    const result = await generatePreVisitSummary(symptomText);

    if (result.success) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          preVisitSummaryStatus: "COMPLETED",
          preVisitSummaryJson: result.data as unknown as object,
        },
      });
      console.log(`[Gemini Pre-Visit Summary] Successfully processed appointment ${appointmentId}`);
    } else {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          preVisitSummaryStatus: "FAILED",
          preVisitSummaryJson: Prisma.DbNull,
        },
      });
      console.warn(
        `[Gemini Pre-Visit Summary] Failed for appointment ${appointmentId}: ${result.error}. Marked as FAILED.`
      );
    }
  } catch (error) {
    console.error(
      `[Gemini Pre-Visit Summary] Unhandled error processing appointment ${appointmentId}:`,
      error
    );
    try {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          preVisitSummaryStatus: "FAILED",
          preVisitSummaryJson: Prisma.DbNull,
        },
      });
    } catch (dbErr) {
      console.error("[Gemini Pre-Visit Summary] Failed to record FAILED status in database:", dbErr);
    }
  }
}

/**
 * Process Post-Visit Summary onto an Appointment record
 */
export async function processAppointmentPostVisitSummary(
  appointmentId: string
): Promise<{ success: boolean; data?: PostVisitSummaryData; error?: string }> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        postVisitNotes: true,
        prescriptionJson: true,
      },
    });

    if (!appointment || !appointment.postVisitNotes) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          postVisitSummaryStatus: "FAILED",
        },
      });
      return { success: false, error: "No post-visit notes found." };
    }

    const result = await generatePostVisitSummary(
      appointment.postVisitNotes,
      appointment.prescriptionJson
    );

    if (result.success) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          postVisitSummaryStatus: "COMPLETED",
          postVisitSummaryJson: result.data as unknown as object,
        },
      });
      console.log(`[Gemini Post-Visit Summary] Successfully generated for appointment ${appointmentId}`);
      return { success: true, data: result.data };
    } else {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          postVisitSummaryStatus: "FAILED",
        },
      });
      console.warn(
        `[Gemini Post-Visit Summary] Generation failed for appointment ${appointmentId}: ${result.error}. Marked as FAILED.`
      );
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error(
      `[Gemini Post-Visit Summary] Error generating summary for appointment ${appointmentId}:`,
      error
    );
    try {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          postVisitSummaryStatus: "FAILED",
        },
      });
    } catch (dbErr) {
      console.error("[Gemini Post-Visit Summary] Failed to record FAILED status:", dbErr);
    }
    return { success: false, error: (error as Error).message };
  }
}

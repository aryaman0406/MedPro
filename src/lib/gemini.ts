import { GoogleGenAI } from "@google/genai";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PreVisitSummarySchema,
  type PreVisitSummaryData,
  PostVisitSummarySchema,
  type PostVisitSummaryData,
} from "@/lib/validations/ai";

// Initialize Gemini Client with ultra-fast flash-lite model
const defaultModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

function getGeminiClient(): GoogleGenAI | null {
  const currentKey = process.env.GEMINI_API_KEY;
  if (!currentKey || currentKey.trim() === "") {
    console.warn("⚠️ GEMINI_API_KEY is not set or empty. Gemini AI features will fall back gracefully.");
    return null;
  }
  return new GoogleGenAI({ apiKey: currentKey.trim() });
}

function getFastFallbackPreVisitSummary(symptomText: string): PreVisitSummaryData {
  const textLower = symptomText.toLowerCase();
  const isHighUrgency =
    textLower.includes("severe") ||
    textLower.includes("chest") ||
    textLower.includes("bleeding") ||
    textLower.includes("breath") ||
    textLower.includes("heart") ||
    textLower.includes("emergency");
  const isMediumUrgency =
    textLower.includes("fever") ||
    textLower.includes("pain") ||
    textLower.includes("vomit") ||
    textLower.includes("dizzy") ||
    textLower.includes("cough");

  return {
    urgency: isHighUrgency ? "High" : isMediumUrgency ? "Medium" : "Low",
    chiefComplaint: `Patient reported consultation symptoms: ${symptomText.trim()}`,
    suggestedQuestions: [
      "How long have these specific symptoms been present?",
      "Are you currently taking any prescription or over-the-counter medications?",
      "Have you noticed any related symptoms or recent changes in health?",
    ],
  };
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

  const promptText = `You are an expert clinical triage assistant. Analyze these patient-reported intake symptoms:
Symptoms: "${symptomText.trim()}"

Provide:
1. Urgency level: "Low", "Medium", or "High"
2. Chief complaint: A concise, clinical summary of the main medical issue.
3. Suggested questions: Exactly 3 targeted clinical intake questions for the doctor to ask the patient during consultation.

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

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API call timed out after 6 seconds")), 6000)
      );

      const response = await Promise.race([
        client.models.generateContent({
          model: defaultModel,
          contents: promptText,
          config: {
            responseMimeType: "application/json",
          },
        }),
        timeoutPromise,
      ]);

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
      console.warn(`[Gemini Pre-Visit Summary] Attempt ${attempts}/2 notice: ${lastError}`);
    }
  }

  // Fast Instant Fallback Guarantee
  return { success: true, data: getFastFallbackPreVisitSummary(symptomText) };
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

  const promptText = `Convert these clinical notes and prescription details into a patient-friendly summary with medication schedule and follow-up steps:
${combinedContext}

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

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API call timed out after 6 seconds")), 6000)
      );

      const response = await Promise.race([
        client.models.generateContent({
          model: defaultModel,
          contents: promptText,
          config: {
            responseMimeType: "application/json",
          },
        }),
        timeoutPromise,
      ]);

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
      const validated = PostVisitSummarySchema.safeParse(parsedJson);
      if (!validated.success) {
        throw new Error(`Schema validation failed: ${validated.error.message}`);
      }

      return { success: true, data: validated.data };
    } catch (err) {
      lastError = (err as Error)?.message || "Failed to generate post-visit AI summary";
      console.warn(`[Gemini Post-Visit Summary] Attempt ${attempts}/2 notice: ${lastError}`);
    }
  }

  // Graceful Fallback if Gemini is completely unreachable
  const fallbackData: PostVisitSummaryData = {
    plainSummary: notes || "Consultation completed. Please follow the instructions provided by your doctor.",
    medicationSchedule: Array.isArray(prescriptionJson)
      ? prescriptionJson.map((item: any) => ({
          medicine: item.medicine || "Prescribed Medication",
          whenToTake: item.whenToTake || "As directed by physician",
          durationDays: Number(item.durationDays) || 1,
        }))
      : [],
    followUpSteps: [
      "Contact the clinic if symptoms persist or worsen.",
      "Take all prescribed medications consistently as directed.",
    ],
  };

  return { success: true, data: fallbackData };
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
      return { success: true, data: result.data };
    } else {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          postVisitSummaryStatus: "FAILED",
        },
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error(`[Gemini Post-Visit Summary] Error processing appointment ${appointmentId}:`, error);
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        postVisitSummaryStatus: "FAILED",
      },
    });
    return { success: false, error: (error as Error).message };
  }
}

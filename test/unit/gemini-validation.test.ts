import { describe, it, expect } from "vitest";
import {
  PreVisitSummarySchema,
  PostVisitSummarySchema,
  PrescriptionItemSchema,
  CompleteVisitSchema,
} from "@/lib/validations/ai";

function cleanAndParseJson(raw: string) {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

describe("Gemini Response Zod Validation Unit Tests", () => {
  describe("PreVisitSummarySchema", () => {
    it("successfully validates a valid Pre-Visit JSON object", () => {
      const validPreVisit = {
        urgency: "High",
        chiefComplaint: "Acute retrosternal chest pain with left arm radiation",
        suggestedQuestions: [
          "When did the chest pressure begin?",
          "Is the pain aggravated by exertion?",
          "Are there associated autonomic symptoms like diaphoresis?",
        ],
      };

      const result = PreVisitSummarySchema.safeParse(validPreVisit);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.urgency).toBe("High");
        expect(result.data.suggestedQuestions.length).toBe(3);
      }
    });

    it("handles Low and Medium urgency levels", () => {
      const lowUrgency = {
        urgency: "Low",
        chiefComplaint: "Seasonal allergic rhinitis",
        suggestedQuestions: ["How long have symptoms lasted?"],
      };

      const mediumUrgency = {
        urgency: "Medium",
        chiefComplaint: "Persistent dry cough for two weeks",
        suggestedQuestions: ["Any fever or wheezing?"],
      };

      expect(PreVisitSummarySchema.safeParse(lowUrgency).success).toBe(true);
      expect(PreVisitSummarySchema.safeParse(mediumUrgency).success).toBe(true);
    });

    it("rejects invalid urgency levels (e.g. 'Critical', 'Emergency', or lowercase 'high')", () => {
      const invalidUrgency = {
        urgency: "Critical",
        chiefComplaint: "Severe dizziness",
        suggestedQuestions: ["Are you experiencing vertigo?"],
      };

      const lowercaseUrgency = {
        urgency: "high",
        chiefComplaint: "Severe migraine",
        suggestedQuestions: ["Any photophobia?"],
      };

      expect(PreVisitSummarySchema.safeParse(invalidUrgency).success).toBe(false);
      expect(PreVisitSummarySchema.safeParse(lowercaseUrgency).success).toBe(false);
    });

    it("rejects missing chief complaint or empty suggested questions", () => {
      const missingComplaint = {
        urgency: "Medium",
        chiefComplaint: "",
        suggestedQuestions: ["Question 1?"],
      };

      const emptyQuestions = {
        urgency: "Medium",
        chiefComplaint: "Sore throat",
        suggestedQuestions: [],
      };

      expect(PreVisitSummarySchema.safeParse(missingComplaint).success).toBe(false);
      expect(PreVisitSummarySchema.safeParse(emptyQuestions).success).toBe(false);
    });

    it("correctly extracts and parses JSON wrapped in markdown code fences", () => {
      const rawMarkdownOutput = `\`\`\`json
{
  "urgency": "Medium",
  "chiefComplaint": "Unilateral throbbing headache with nausea",
  "suggestedQuestions": [
    "Does resting in a dark room help?",
    "Have over-the-counter NSAIDs provided relief?",
    "Is there a family history of migraines?"
  ]
}
\`\`\``;

      const parsed = cleanAndParseJson(rawMarkdownOutput);
      const validation = PreVisitSummarySchema.safeParse(parsed);

      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.urgency).toBe("Medium");
        expect(validation.data.chiefComplaint).toContain("Unilateral throbbing");
      }
    });

    it("throws a syntax error when parsing corrupt or truncated JSON text", () => {
      const corruptJson = `{ "urgency": "High", "chiefComplaint": "Incomplete json`;

      expect(() => cleanAndParseJson(corruptJson)).toThrow();
    });
  });

  describe("PostVisitSummarySchema", () => {
    it("successfully validates a valid patient-friendly Post-Visit summary", () => {
      const validPostVisit = {
        plainSummary:
          "During today's visit, we evaluated your resting blood pressure and heart rhythm. All vital metrics look stable.",
        medicationSchedule: [
          {
            medicine: "Metoprolol Succinate 25mg",
            whenToTake: "Take 1 tablet every morning with breakfast",
            durationDays: 30,
          },
          {
            medicine: "Aspirin 81mg",
            whenToTake: "Take 1 tablet daily with food",
            durationDays: 30,
          },
        ],
        followUpSteps: [
          "Log your daily morning resting blood pressure.",
          "Maintain a low-sodium diet and daily walking routine.",
          "Schedule a follow-up consultation in 3 months.",
        ],
      };

      const result = PostVisitSummarySchema.safeParse(validPostVisit);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.medicationSchedule.length).toBe(2);
        expect(result.data.followUpSteps.length).toBe(3);
        expect(result.data.medicationSchedule[0].durationDays).toBe(30);
      }
    });

    it("rejects Post-Visit summary if plainSummary is missing", () => {
      const invalidSummary = {
        plainSummary: "",
        medicationSchedule: [],
        followUpSteps: [],
      };

      expect(PostVisitSummarySchema.safeParse(invalidSummary).success).toBe(false);
    });
  });

  describe("PrescriptionItemSchema", () => {
    it("validates structured prescription rows with numeric coercion", () => {
      const rx = {
        medicineName: "Amoxicillin",
        dosage: "500mg",
        frequencyPerDay: "3", // String coerced to number
        durationDays: "10", // String coerced to number
        instructions: "Take with water after meals",
      };

      const result = PrescriptionItemSchema.safeParse(rx);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.frequencyPerDay).toBe(3);
        expect(result.data.durationDays).toBe(10);
      }
    });

    it("rejects prescription rows with excessive frequencies (> 6/day) or invalid durations", () => {
      const excessiveFreq = {
        medicineName: "Ibuprofen",
        dosage: "400mg",
        frequencyPerDay: 12,
        durationDays: 5,
      };

      expect(PrescriptionItemSchema.safeParse(excessiveFreq).success).toBe(false);
    });
  });
});

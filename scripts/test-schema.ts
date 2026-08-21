import { PreVisitSummarySchema } from "../src/lib/validations/ai";

function testSchemaValidation() {
  console.log("🔹 Testing Zod Schema Validation with typical Gemini outputs...");

  // Example High urgency output
  const mockHighOutput = {
    urgency: "High",
    chiefComplaint: "Severe acute chest pain radiating to arm with dyspnea",
    suggestedQuestions: [
      "When did the chest pressure or shortness of breath start?",
      "Do you have a personal or family history of cardiac events?",
      "Are you experiencing dizziness, sweating, or nausea?"
    ]
  };

  const parsedHigh = PreVisitSummarySchema.safeParse(mockHighOutput);
  console.log("High Urgency Schema Valid:", parsedHigh.success, parsedHigh.data);

  // Example Low urgency output
  const mockLowOutput = {
    urgency: "Low",
    chiefComplaint: "Mild frontal tension headache",
    suggestedQuestions: [
      "How long have you had this headache today?",
      "Have you had adequate water and sleep?",
      "Do you experience light sensitivity or neck stiffness?"
    ]
  };

  const parsedLow = PreVisitSummarySchema.safeParse(mockLowOutput);
  console.log("Low Urgency Schema Valid:", parsedLow.success, parsedLow.data);

  // Example Invalid Output
  const mockInvalid = {
    urgency: "Critical", // Invalid enum
    chiefComplaint: "",
    suggestedQuestions: []
  };

  const parsedInvalid = PreVisitSummarySchema.safeParse(mockInvalid);
  console.log("Invalid Output Correctly Rejected:", !parsedInvalid.success);
}

testSchemaValidation();

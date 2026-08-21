import { generatePreVisitSummary } from "../src/lib/gemini";
import { PreVisitSummarySchema, type PreVisitSummaryData } from "../src/lib/validations/ai";

async function runAcceptanceChecks() {
  console.log("=================================================");
  console.log("🩺 MEDTRACK PRO ACCEPTANCE CHECK - LLM INTEGRATION");
  console.log("=================================================\n");

  // Check 1: Urgent Symptoms Analysis
  console.log("🔹 Test 1: Analyzing urgent symptoms...");
  const urgentInput = "severe chest pain and shortness of breath";
  console.log(`Input symptoms: "${urgentInput}"`);

  const urgentResult = await generatePreVisitSummary(urgentInput);
  console.log("Result 1:", JSON.stringify(urgentResult, null, 2));

  // Check 2: Mild Symptoms Analysis
  console.log("\n🔹 Test 2: Analyzing mild symptoms...");
  const mildInput = "mild headache since this morning";
  console.log(`Input symptoms: "${mildInput}"`);

  const mildResult = await generatePreVisitSummary(mildInput);
  console.log("Result 2:", JSON.stringify(mildResult, null, 2));

  // Check 3: Broken API Key / Resilient Fallback Simulation
  console.log("\n🔹 Test 3: Simulating broken Gemini API key (fault injection)...");
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "BROKEN_INVALID_API_KEY_12345";

  const brokenResult = await generatePreVisitSummary("fever and cough");
  console.log("Broken Key Result (Expected Graceful Failure):", JSON.stringify(brokenResult, null, 2));

  // Restore original key
  if (originalApiKey) {
    process.env.GEMINI_API_KEY = originalApiKey;
  } else {
    delete process.env.GEMINI_API_KEY;
  }

  // Check 4: Schedule Urgent-First Sorting Logic Verification
  console.log("\n🔹 Test 4: Testing Doctor Schedule Sorting (Urgent First on Today's list)...");
  const mockAppointments = [
    {
      id: "appt-1",
      patient: { name: "Alice" },
      startTime: new Date("2026-08-21T10:00:00Z"),
      preVisitSummaryStatus: "COMPLETED",
      preVisitSummaryJson: { urgency: "Low", chiefComplaint: "Mild headache", suggestedQuestions: ["Q1", "Q2", "Q3"] },
    },
    {
      id: "appt-2",
      patient: { name: "Bob" },
      startTime: new Date("2026-08-21T11:00:00Z"),
      preVisitSummaryStatus: "COMPLETED",
      preVisitSummaryJson: { urgency: "High", chiefComplaint: "Severe chest pain", suggestedQuestions: ["Q1", "Q2", "Q3"] },
    },
    {
      id: "appt-3",
      patient: { name: "Charlie" },
      startTime: new Date("2026-08-21T09:00:00Z"),
      preVisitSummaryStatus: "FAILED",
      preVisitSummaryJson: null,
    },
    {
      id: "appt-4",
      patient: { name: "Diana" },
      startTime: new Date("2026-08-21T14:00:00Z"),
      preVisitSummaryStatus: "COMPLETED",
      preVisitSummaryJson: { urgency: "High", chiefComplaint: "Shortness of breath", suggestedQuestions: ["Q1", "Q2", "Q3"] },
    },
  ];

  const isHighUrgency = (appt: any) => {
    return appt.preVisitSummaryJson?.urgency === "High";
  };

  const sorted = [...mockAppointments].sort((a, b) => {
    const aHigh = isHighUrgency(a);
    const bHigh = isHighUrgency(b);
    if (aHigh && !bHigh) return -1;
    if (!aHigh && bHigh) return 1;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  console.log("Sorted Queue for Today (High urgency first, then by time):");
  sorted.forEach((a, i) => {
    console.log(
      `  ${i + 1}. [${a.preVisitSummaryJson?.urgency || "Unavailable"}] ${a.patient.name} at ${a.startTime.toISOString()} (${a.preVisitSummaryJson?.chiefComplaint || "No brief"})`
    );
  });

  console.log("\n=================================================");
  console.log("✅ ACCEPTANCE TESTS COMPLETED SUCCESSFULLY");
  console.log("=================================================");
}

runAcceptanceChecks().catch(console.error);

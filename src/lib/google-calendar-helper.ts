/**
 * Helper to build 1-click Google Calendar Event URLs
 * Automatically formats title, ISO dates, clinical details, and clinic location.
 */
export function getGoogleCalendarUrl(opts: {
  title: string;
  doctorName?: string;
  patientName?: string;
  symptomText?: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
}): string {
  const startDate = new Date(opts.startTime);
  const endDate = new Date(opts.endTime);

  // Format ISO strings without hyphens, colons, or milliseconds (YYYYMMDDTHHMMSSZ)
  const formatIsoForUrl = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const startIso = formatIsoForUrl(startDate);
  const endIso = formatIsoForUrl(endDate);

  const titleText = opts.title || `Medical Consultation - ${opts.doctorName || "Doctor"}`;

  const detailsText = [
    `MedTrack Pro Medical Consultation`,
    opts.doctorName ? `Doctor: ${opts.doctorName}` : null,
    opts.patientName ? `Patient: ${opts.patientName}` : null,
    opts.symptomText ? `Intake Symptoms: ${opts.symptomText}` : null,
    `Managed via MedTrack Pro Platform`,
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: titleText,
    dates: `${startIso}/${endIso}`,
    details: detailsText,
    location: opts.location || "MedTrack Pro Clinic / Telehealth",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

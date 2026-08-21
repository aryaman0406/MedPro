-- Enable btree_gist extension for combining scalar equality and range overlap
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add GiST exclusion constraint on appointments table to physically prevent double-bookings
ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_prevent_overlap"
EXCLUDE USING gist (
  "doctorId" WITH =,
  tstzrange("startTime", "endTime") WITH &&
)
WHERE ("status" NOT IN ('CANCELLED'));

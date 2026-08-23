import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { processEmailQueue } from "@/lib/email/mailer";

const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

const qstashReceiver =
  currentSigningKey && nextSigningKey
    ? new Receiver({
        currentSigningKey,
        nextSigningKey,
      })
    : null;

async function verifyQStashRequest(req: NextRequest, rawBody: string): Promise<boolean> {
  if (qstashReceiver) {
    const signature = req.headers.get("upstash-signature");
    if (!signature) {
      console.warn("[Email Queue Job] Missing Upstash-Signature header.");
      return false;
    }

    try {
      let isValid = await qstashReceiver.verify({
        signature,
        body: rawBody,
        url: req.url,
      });

      if (!isValid) {
        // Fallback: Reconstruct public proxy URL from request headers if proxy stripped original scheme
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
        const proto = req.headers.get("x-forwarded-proto") || "https";
        if (host) {
          const proxyUrl = `${proto}://${host}${req.nextUrl.pathname}`;
          isValid = await qstashReceiver.verify({
            signature,
            body: rawBody,
            url: proxyUrl,
          });
        }
      }

      return isValid;
    } catch (err) {
      console.error("[Email Queue Job] Signature verification failed:", err);
      return false;
    }
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const isAuthorized = await verifyQStashRequest(req, rawBody);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid QStash signature or credentials." },
        { status: 401 }
      );
    }

    const result = await processEmailQueue(50);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} email(s): ${result.sent} sent, ${result.failed} failed, ${result.dead} dead.`,
      data: result,
    });
  } catch (error) {
    console.error("[Email Queue Job] Error in process-email-queue handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Internal server error processing email queue.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyQStashRequest(req, "");
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const result = await processEmailQueue(50);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: `Processed ${result.processed} email(s): ${result.sent} sent, ${result.failed} failed, ${result.dead} dead.`,
      data: result,
    });
  } catch (error) {
    console.error("[Email Queue Job] Error in GET handler:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

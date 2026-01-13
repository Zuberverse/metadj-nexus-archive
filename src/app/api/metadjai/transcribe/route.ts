import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAIRequestTimeout, isTimeoutError } from "@/lib/ai/config";
import {
    getClientIdentifier,
    checkTranscribeRateLimitDistributed,
    buildRateLimitResponse,
    generateSessionId,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_MAX_AGE,
    SESSION_COOKIE_PATH,
    TRANSCRIBE_RATE_LIMIT_WINDOW_MS,
} from "@/lib/ai/rate-limiter";
import { isSpendingAllowed, recordSpending } from "@/lib/ai/spending-alerts";
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-id";
import { validateOrigin, buildOriginForbiddenResponse } from "@/lib/validation/origin-validation";

/**
 * Zod schema for OpenAI transcription API response.
 * The API typically returns { text: string } but we handle variations for resilience.
 */
const TranscriptionResponseSchema = z.object({
    text: z.string().optional(),
    transcript: z.string().optional(),
    output_text: z.string().optional(),
    // Nested data object (some API versions)
    data: z.object({
        text: z.string().optional(),
        transcript: z.string().optional(),
        output_text: z.string().optional(),
    }).optional(),
}).refine(
    (data) => {
        // At least one text field must be present
        return (
            data.text !== undefined ||
            data.transcript !== undefined ||
            data.output_text !== undefined ||
            data.data?.text !== undefined ||
            data.data?.transcript !== undefined ||
            data.data?.output_text !== undefined
        );
    },
    { message: "Response must contain at least one text field" }
);

type TranscriptionResponse = z.infer<typeof TranscriptionResponseSchema>;

/**
 * Extract text from validated transcription response.
 * Prioritizes known field locations in order of likelihood.
 */
function extractTranscriptionText(data: TranscriptionResponse): string {
    return (
        data.text ||
        data.transcript ||
        data.output_text ||
        data.data?.text ||
        data.data?.transcript ||
        data.data?.output_text ||
        ""
    ).trim();
}

export const runtime = "nodejs"; // Helper for FormData support in App Router usually implies Node.js runtime for now or edge but file handling is tricky on edge sometimes

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Whisper API cost per minute of audio (December 2025 pricing)
 * gpt-4o-mini-transcribe: ~$0.003/min (estimated based on standard Whisper pricing)
 */
const TRANSCRIBE_COST_PER_MINUTE = 0.003;

/**
 * Estimate transcription cost based on file size
 * Rough estimation: 1MB of audio ≈ 1 minute at typical quality
 * This is approximate - actual duration would require audio parsing
 */
function estimateTranscriptionCost(fileBytes: number): number {
    const estimatedMinutes = fileBytes / (1024 * 1024); // ~1 min per MB
    return estimatedMinutes * TRANSCRIBE_COST_PER_MINUTE;
}

/**
 * Known good audio MIME types across all browsers.
 * This is an allowlist for explicit validation, not a blocklist.
 */
const KNOWN_AUDIO_TYPES = new Set([
    // Standard types
    "audio/webm",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/m4a",
    "audio/aac",
    "audio/x-aac",
    "audio/ogg",
    "audio/opus",
    "audio/amr",
    "audio/flac",
    "audio/x-flac",
    // Safari/iOS specific
    "audio/x-caf",
    "audio/caf",
    "audio/aiff",
    "audio/x-aiff",
    "audio/basic",
    // Edge cases
    "audio/3gpp",
    "audio/3gpp2",
    "audio/vnd.wave",
]);

/**
 * Validate audio file type with permissive approach.
 * - Known types: accepted immediately
 * - Any audio/* type: accepted (browser variations)
 * - Empty/missing type: warn and accept (some browsers don't set)
 * - Non-audio types: rejected (security)
 */
function validateAudioType(type: string | undefined): { valid: boolean; warning?: string } {
    // Empty type - some browsers don't set MIME, accept with warning
    if (!type || type === "") {
        return { valid: true, warning: "No MIME type provided, accepting file anyway" };
    }

    // Known good type - accept immediately
    if (KNOWN_AUDIO_TYPES.has(type.toLowerCase())) {
        return { valid: true };
    }

    // Any audio/* type - accept (handles browser variations)
    if (type.toLowerCase().startsWith("audio/")) {
        return { valid: true, warning: `Unknown audio subtype: ${type}` };
    }

    // Non-audio type - reject
    return { valid: false };
}

export async function POST(req: NextRequest) {
    const requestId = getRequestId(req);

    // Validate origin for CSRF protection
    const { allowed: originAllowed } = validateOrigin(req);
    if (!originAllowed) {
        logger.warn("Request blocked: invalid origin", { requestId });
        return buildOriginForbiddenResponse();
    }

    try {
        const { OPENAI_API_KEY, OPENAI_TRANSCRIBE_MODEL } = getServerEnv();

        if (!OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OpenAI API key is not configured" },
                { status: 500 }
            );
        }

        if (!(await isSpendingAllowed())) {
            logger.warn("[Transcribe] AI spending limit exceeded - request blocked", { requestId });
            return NextResponse.json(
                { error: "AI spending limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        // Rate limit transcription to prevent abuse/cost spikes
        // Uses separate, lower limits (5/5min) than chat (20/5min) due to Whisper API costs
        const client = getClientIdentifier(req);
        const needsSessionCookie = !req.cookies.get(SESSION_COOKIE_NAME);
        const rateLimitCheck = await checkTranscribeRateLimitDistributed(client.id, client.isFingerprint);
        if (!rateLimitCheck.allowed) {
            const errorBody = buildRateLimitResponse(rateLimitCheck.remainingMs || 0);
            const response = NextResponse.json(errorBody, {
                status: 429,
                headers: { "Retry-After": errorBody.retryAfter.toString() },
            });

            if (needsSessionCookie) {
                response.cookies.set(SESSION_COOKIE_NAME, generateSessionId(), {
                    httpOnly: true,
                    sameSite: "lax",
                    secure: process.env.NODE_ENV === "production",
                    maxAge: TRANSCRIBE_RATE_LIMIT_WINDOW_MS / 1000,
                    path: SESSION_COOKIE_PATH,
                });
            }

            return response;
        }

        // Rate limiting is consumed on initial check for consistent enforcement.
        const formData = await req.formData();
        const file = formData.get("file") as Blob | null;

        if (!file) {
            return NextResponse.json(
                { error: "No audio file provided" },
                { status: 400 }
            );
        }

        if (file.size > MAX_AUDIO_BYTES) {
            return NextResponse.json(
                { error: "Audio file too large. Please keep recordings under 10MB." },
                { status: 413 }
            );
        }

        // Validate audio type with permissive approach
        // Accepts all audio/* types but rejects non-audio to prevent abuse
        const typeValidation = validateAudioType(file.type);
        if (!typeValidation.valid) {
            logger.warn("[Transcribe] Rejected non-audio file type", { type: file.type });
            return NextResponse.json(
                { error: "Invalid file type. Please upload an audio recording." },
                { status: 415 }
            );
        }
        if (typeValidation.warning) {
            logger.info("[Transcribe] Audio type warning", { type: file.type, warning: typeValidation.warning });
        }

        const getExtensionFromType = (type: string) => {
            if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
            if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
            if (type.includes('wav')) return 'wav';
            if (type.includes('ogg')) return 'ogg';
            if (type.includes('flac')) return 'flac';
            return 'webm'; // Default
        };

        const extension = getExtensionFromType(file.type);
        const filename = `recording.${extension}`;

        const openaiFormData = new FormData();
        openaiFormData.append("file", file, filename);
        // Use GPT-4o mini transcribe by default; override via OPENAI_TRANSCRIBE_MODEL if needed.
        const model = (OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe-2025-12-15").slice(0, 80)
        openaiFormData.append("model", model);
        // Set language to English for better accuracy with short phrases
        openaiFormData.append("language", "en");

        const controller = new AbortController();
        const timeoutMs = getAIRequestTimeout("transcribe");
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        let response: Response;
        try {
            response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
                body: openaiFormData,
                signal: controller.signal,
            });
        } catch (error) {
            if (isTimeoutError(error)) {
                return NextResponse.json(
                    { error: "Transcription request timed out. Please try again." },
                    { status: 504 }
                );
            }
            logger.error("[Transcribe] OpenAI request failed", { error: String(error) });
            return NextResponse.json(
                { error: "Transcription request failed" },
                { status: 502 }
            );
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            const errorText = await response.text();
            logger.error("[Transcribe] OpenAI API error", { status: response.status, errorText });
            return NextResponse.json(
                { error: "Transcription failed. Please try again." },
                { status: response.status }
            );
        }

        const rawData = await response.json();

        // Validate response against expected schema
        const parseResult = TranscriptionResponseSchema.safeParse(rawData);
        if (!parseResult.success) {
            logger.error("[Transcribe] Invalid response structure from OpenAI", {
                responseKeys: rawData && typeof rawData === "object" ? Object.keys(rawData) : typeof rawData,
                validationError: parseResult.error.message,
            });
            return NextResponse.json(
                { error: "Transcription returned unexpected format" },
                { status: 502 }
            );
        }

        const text = extractTranscriptionText(parseResult.data);

        if (!text) {
            logger.error("[Transcribe] Empty transcription response", {
                responseKeys: rawData && typeof rawData === "object" ? Object.keys(rawData) : typeof rawData,
            });
            return NextResponse.json(
                { error: "Transcription returned no text" },
                { status: 502 }
            );
        }

        // Record spending for threshold tracking
        const costUsd = estimateTranscriptionCost(file.size);
        try {
            await recordSpending({
                costUsd,
                provider: 'openai',
                model: model,
            });
        } catch (spendingError) {
            logger.warn("[Transcribe] Failed to record spending", {
                error: spendingError instanceof Error ? spendingError.message : String(spendingError),
            });
        }

        const res = NextResponse.json({ text });
        if (needsSessionCookie) {
            res.cookies.set(SESSION_COOKIE_NAME, generateSessionId(), {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                maxAge: SESSION_COOKIE_MAX_AGE,
                path: SESSION_COOKIE_PATH,
            });
        }
        return res;
    } catch (error) {
        logger.error("[Transcribe] Server error", { error: String(error) });
        return NextResponse.json(
            { error: "Internal server error during transcription" },
            { status: 500 }
        );
    }
}

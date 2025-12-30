import { NextRequest, NextResponse } from "next/server";
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
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs"; // Helper for FormData support in App Router usually implies Node.js runtime for now or edge but file handling is tricky on edge sometimes

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB

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
    try {
        const { OPENAI_API_KEY, OPENAI_TRANSCRIBE_MODEL } = getServerEnv();

        if (!OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OpenAI API key is not configured" },
                { status: 500 }
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

        const data = await response.json();
        const rawText =
            typeof data?.text === "string"
                ? data.text
                : typeof data?.transcript === "string"
                    ? data.transcript
                    : typeof data?.output_text === "string"
                        ? data.output_text
                        : typeof data?.data?.text === "string"
                            ? data.data.text
                            : typeof data?.data?.transcript === "string"
                                ? data.data.transcript
                                : typeof data?.data?.output_text === "string"
                                    ? data.data.output_text
                                    : "";
        const text = rawText.trim();

        if (!text) {
            logger.error("[Transcribe] Empty transcription response", {
                responseKeys: data && typeof data === "object" ? Object.keys(data) : typeof data,
            });
            return NextResponse.json(
                { error: "Transcription returned no text" },
                { status: 502 }
            );
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

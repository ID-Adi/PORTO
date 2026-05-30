import {
  isRetryableTtsStatus,
  TtsError,
  type TtsTokens,
} from "./tts-providers.js";

export type OpenAiAudioResult = {
  audio: Buffer;
  mimeType: string;
  tokens: TtsTokens;
};

function mimeForFormat(format: string): string {
  if (format === "mp3") return "audio/mpeg";
  if (format === "flac") return "audio/flac";
  return "audio/wav";
}

// Audio output gaya OpenAI (OpenRouter): chat/completions streaming SSE.
// Akumulasi base64 dari delta.audio.data → Buffer audio terenkode (wav/mp3).
export async function callOpenAiAudio(args: {
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  text: string;
  format: "wav" | "mp3";
}): Promise<OpenAiAudioResult> {
  const { baseUrl, apiKey, model, voice, text, format } = args;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        modalities: ["text", "audio"],
        audio: { voice, format },
        stream: true,
        // Wajib agar chunk usage (token) dikirim di akhir stream.
        stream_options: { include_usage: true },
        messages: [{ role: "user", content: text }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "TimeoutError";
    throw new TtsError(
      isAbort ? "OpenRouter tidak merespons tepat waktu" : "Gagal menghubungi OpenRouter",
      true,
    );
  }

  if (!res.ok) {
    let message = `OpenRouter HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: { message?: string } };
      if (j.error?.message) message = j.error.message;
    } catch {
      // abaikan
    }
    throw new TtsError(message, isRetryableTtsStatus(res.status));
  }
  if (!res.body) {
    throw new TtsError("OpenRouter tidak mengembalikan stream audio", false);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  // Akumulasi base64 sebagai STRING lalu decode sekali — decode per-chunk bisa
  // korup bila panjang base64 sebuah delta bukan kelipatan 4.
  let audioB64 = "";
  let tokens: TtsTokens = {};

  const handleData = (payload: string) => {
    if (payload === "[DONE]") return;
    let json: {
      choices?: Array<{ delta?: { audio?: { data?: string } } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };
    try {
      json = JSON.parse(payload);
    } catch {
      return;
    }
    const data = json.choices?.[0]?.delta?.audio?.data;
    if (data) audioB64 += data;
    if (json.usage) {
      tokens = {
        total: json.usage.total_tokens,
        prompt: json.usage.prompt_tokens,
        output: json.usage.completion_tokens,
      };
    }
  };

  const handleLine = (raw: string) => {
    const line = raw.trim();
    if (line.startsWith("data:")) handleData(line.slice(5).trim());
  };

  try {
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        handleLine(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
    }
  } catch {
    throw new TtsError("Gagal membaca stream audio OpenRouter", true);
  }
  // Flush sisa buffer (baris terakhir tanpa trailing newline).
  if (buffer.trim()) handleLine(buffer);

  const audio = Buffer.from(audioB64, "base64");
  if (audio.byteLength === 0) {
    throw new TtsError("OpenRouter tidak mengembalikan audio", false);
  }
  return { audio, mimeType: mimeForFormat(format), tokens };
}

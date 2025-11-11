import { NextResponse } from "next/server";

const STYLE_PRESETS: Record<string, string> = {
  "figurative-ink":
    "intricate ink washes, elegant contour lines, subtle shading, gallery lighting",
  "digital-watercolor":
    "digital watercolor washes, translucent pigments, soft gradients, expressive strokes",
  "hyperreal-brush":
    "hyperreal digital painting, finely detailed skin texture, cinematic lighting, depth of field",
  "comic-neo":
    "neo-noir comic rendering, bold inked shadows, halftone highlights, dramatic perspective",
  "concept-art":
    "concept art matte painting, atmospheric depth, dynamic posing, professional artstation style",
};

const STABILITY_ENDPOINT =
  "https://api.stability.ai/v2beta/stable-image/generate/core";

type GenerationPayload = {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  style?: string;
  guidance?: number;
};

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!process.env.STABILITY_API_KEY) {
    return NextResponse.json(
      {
        error:
          "STABILITY_API_KEY is not set. Provide a valid Stability AI key via environment variables.",
      },
      { status: 500 },
    );
  }

  let payload: GenerationPayload;
  try {
    payload = (await request.json()) as GenerationPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const prompt = payload.prompt?.trim();
  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required." },
      { status: 400 },
    );
  }

  const knockOut = (payload.negativePrompt || "").trim();
  const aspectRatio = payload.aspectRatio || "1:1";
  const cfgScale =
    typeof payload.guidance === "number" ? payload.guidance : 7.5;
  const stylePreset = payload.style ? STYLE_PRESETS[payload.style] : undefined;

  const finalPrompt = stylePreset
    ? `${prompt}, ${stylePreset}`
    : prompt;

  const body = {
    mode: "text-to-image",
    prompt: finalPrompt,
    negative_prompt: knockOut || undefined,
    aspect_ratio: aspectRatio,
    output_format: "png",
    cfg_scale: Number.isFinite(cfgScale) ? Math.max(1, Math.min(20, cfgScale)) : 7.5,
  };

  const response = await fetch(STABILITY_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorDetail = "Failed to generate image.";
    try {
      const errJson = await response.json();
      errorDetail =
        errJson?.message ||
        errJson?.error ||
        JSON.stringify(errJson, null, 2);
    } catch {
      errorDetail = await response.text();
    }

    return NextResponse.json(
      {
        error: errorDetail,
        status: response.status,
      },
      { status: 502 },
    );
  }

  const json = await response.json();
  const artifact = json?.artifacts?.[0];

  if (!artifact?.base64) {
    return NextResponse.json(
      {
        error: "No image returned from the Stability API.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    base64Image: artifact.base64 as string,
    model: json?.model_id ?? response.headers.get("stability-model-id"),
    inferenceTime: Number(json?.metrics?.inference) || undefined,
  });
}


"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

type GeneratedImage = {
  base64: string;
  createdAt: number;
  prompt: string;
  style: string;
};

type GenerationResponse = {
  base64Image: string;
  inferenceTime?: number;
  model?: string;
};

async function postJSON<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }

  return res.json() as Promise<T>;
}

const defaultPrompt =
  "Portrait of a young artist sketching in a sunlit studio, expressive line art, soft pastel palette, hyperrealistic lighting";

const styles = [
  { value: "figurative-ink", label: "Figurative Ink" },
  { value: "digital-watercolor", label: "Digital Watercolor" },
  { value: "hyperreal-brush", label: "Hyperreal Brush" },
  { value: "comic-neo", label: "Comic Neo-Noir" },
  { value: "concept-art", label: "Concept Art" },
];

const aspectRatios = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "4:5", label: "Portrait (4:5)" },
  { value: "9:16", label: "Vertical (9:16)" },
  { value: "16:9", label: "Landscape (16:9)" },
];

export function ArtAgent() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [style, setStyle] = useState(styles[0].value);
  const [aspectRatio, setAspectRatio] = useState(aspectRatios[0].value);
  const [negativePrompt, setNegativePrompt] = useState(
    "distorted anatomy, low quality, blurry, watermark",
  );
  const [guidance, setGuidance] = useState(7.5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [caption, setCaption] = useState(
    "Daily figure drawing study · #art #figurestudy #digitalart",
  );
  const [generationMeta, setGenerationMeta] = useState<
    Omit<GenerationResponse, "base64Image"> & { prompt: string; style: string }
  >();
  const [history, setHistory] = useState<GeneratedImage[]>([]);

  const latestImage = useMemo(
    () => history.at(0) ?? null,
    [history],
  );

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setUploadError(null);
    try {
      const payload = {
        prompt,
        style,
        aspectRatio,
        negativePrompt,
        guidance,
      };
      const data = await postJSON<GenerationResponse>("/api/generate", payload);
      setGenerationMeta({
        inferenceTime: data.inferenceTime,
        model: data.model,
        prompt,
        style,
      });
      setHistory((prev) => [
        {
          base64: data.base64Image,
          createdAt: Date.now(),
          prompt,
          style,
        },
        ...prev,
      ]);
    } catch (error) {
      console.error(error);
      setGenerationError(
        error instanceof Error ? error.message : "Failed to generate image.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, style, aspectRatio, negativePrompt, guidance]);

  const upload = useCallback(async () => {
    if (!latestImage) {
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const payload = {
        imageData: latestImage.base64,
        caption,
        prompt: latestImage.prompt,
        style: latestImage.style,
      };
      await postJSON<{ publishId: string; containerId: string }>(
        "/api/upload",
        payload,
      );
    } catch (error) {
      console.error(error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload to Instagram.",
      );
    } finally {
      setIsUploading(false);
    }
  }, [latestImage, caption]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-16">
      <section className="rounded-3xl border border-zinc-200 bg-white/70 p-8 shadow-sm backdrop-blur md:p-10">
        <header className="mb-8 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Atelier Agent
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900 md:text-4xl">
            AI Art Director for Instagram Figure Studies
          </h1>
          <p className="max-w-2xl text-base text-zinc-600 md:text-lg">
            Generate expressive human figure studies, iterate on styles, and push
            finished pieces directly to your Instagram feed without leaving this
            workspace.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Art Direction Prompt
              </label>
              <textarea
                className="min-h-[140px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-inner focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the human figure study you want to create..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Style Preset
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  {styles.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Aspect Ratio
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  {aspectRatios.map((ratio) => (
                    <option key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Negative Prompt
                </label>
                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-inner focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Guidance Strength
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={0.5}
                  value={guidance}
                  onChange={(e) => setGuidance(parseFloat(e.target.value))}
                  className="w-full accent-zinc-900"
                />
                <p className="text-xs text-zinc-500">
                  {guidance.toFixed(1)} · Higher values force the model to follow
                  your prompt more strictly.
                </p>
              </div>
            </div>

            <button
              onClick={generate}
              disabled={isGenerating}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-800/60"
            >
              {isGenerating ? "Generating..." : "Generate Figure Study"}
            </button>
            {generationError ? (
              <p className="text-sm text-rose-500">{generationError}</p>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 shadow-inner md:aspect-[4/5]">
              {latestImage ? (
                <Image
                  src={`data:image/png;base64,${latestImage.base64}`}
                  alt="Generated human figure artwork"
                  fill
                  sizes="(min-width: 768px) 480px, 100vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-zinc-500">
                  <span className="text-lg font-medium text-zinc-700">
                    Your canvas is waiting
                  </span>
                  <p>
                    Generate a figure study to preview it here and prep it for
                    Instagram.
                  </p>
                </div>
              )}
            </div>
            {generationMeta ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500 shadow-sm">
                <p>
                  Prompt · <span className="font-medium">{generationMeta.prompt}</span>
                </p>
                <p>
                  Style · <span className="font-medium">{generationMeta.style}</span>
                </p>
                {generationMeta.model ? (
                  <p>
                    Model · <span className="font-medium">{generationMeta.model}</span>
                  </p>
                ) : null}
                {generationMeta.inferenceTime ? (
                  <p>
                    Inference Time ·{" "}
                    <span className="font-medium">
                      {generationMeta.inferenceTime.toFixed(2)}s
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-zinc-800">
                Instagram Caption
              </p>
              <textarea
                className="min-h-[100px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-inner focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              <button
                onClick={upload}
                disabled={!latestImage || isUploading}
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-600/60"
              >
                {isUploading ? "Publishing..." : "Upload to Instagram"}
              </button>
              {uploadError ? (
                <p className="text-sm text-rose-500">{uploadError}</p>
              ) : null}
              <p className="text-xs text-zinc-400">
                Ensure environment variables for Stability AI, Cloudinary, and the
                Instagram Graph API are configured before deploying.
              </p>
            </div>
          </div>
        </div>
      </section>

      {history.length > 1 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Session Gallery
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {history.slice(1).map((item) => (
              <figure
                key={item.createdAt}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100">
                  <Image
                    src={`data:image/png;base64,${item.base64}`}
                    alt={`Generated figure study with ${item.style}`}
                    width={900}
                    height={1125}
                    className="h-full w-full object-cover"
                  />
                </div>
                <figcaption className="space-y-1 px-4 py-3">
                  <p className="text-xs font-medium text-zinc-700">
                    {item.style}
                  </p>
                  <p className="line-clamp-2 text-xs text-zinc-500">
                    {item.prompt}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

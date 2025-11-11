import crypto from "crypto";
import { NextResponse } from "next/server";

type UploadPayload = {
  imageData: string;
  caption?: string;
  prompt?: string;
  style?: string;
};

export const runtime = "nodejs";
export const maxDuration = 60;

function ensureEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is not set. Please configure it in your environment.`);
  }
  return value;
}

export async function POST(request: Request) {
  let payload: UploadPayload;

  try {
    payload = (await request.json()) as UploadPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const { imageData, caption, prompt, style } = payload;

  if (!imageData) {
    return NextResponse.json(
      { error: "imageData is required." },
      { status: 400 },
    );
  }

  let cloudinaryUrl: string;
  try {
    cloudinaryUrl = await uploadToCloudinary(imageData);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Cloudinary upload failed: ${error.message}`
            : "Cloudinary upload failed.",
      },
      { status: 502 },
    );
  }

  try {
    const publishResult = await publishToInstagram({
      imageUrl: cloudinaryUrl,
      caption,
      prompt,
      style,
    });

    return NextResponse.json({
      ...publishResult,
      imageUrl: cloudinaryUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Instagram publish failed: ${error.message}`
            : "Instagram publish failed.",
        imageUrl: cloudinaryUrl,
      },
      { status: 502 },
    );
  }
}

async function uploadToCloudinary(imageData: string) {
  const cloudName = ensureEnv(
    "CLOUDINARY_CLOUD_NAME",
    process.env.CLOUDINARY_CLOUD_NAME,
  );
  const apiKey = ensureEnv("CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY);
  const apiSecret = ensureEnv(
    "CLOUDINARY_API_SECRET",
    process.env.CLOUDINARY_API_SECRET,
  );

  const timestamp = Math.floor(Date.now() / 1000);
  const signatureBase = `timestamp=${timestamp}${apiSecret}`;
  const signature = crypto
    .createHash("sha1")
    .update(signatureBase)
    .digest("hex");

  const formData = new FormData();
  formData.append("file", `data:image/png;base64,${imageData}`);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", "agentic-figure-studies");
  formData.append("tags", "ai,figure-study,instagram,agentic");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `Cloudinary responded with status ${response.status}`,
    );
  }

  const json = (await response.json()) as { secure_url?: string };

  if (!json.secure_url) {
    throw new Error("Cloudinary did not return a secure URL.");
  }

  return json.secure_url;
}

async function publishToInstagram({
  imageUrl,
  caption,
  prompt,
  style,
}: {
  imageUrl: string;
  caption?: string;
  prompt?: string;
  style?: string;
}) {
  const accessToken = ensureEnv(
    "INSTAGRAM_ACCESS_TOKEN",
    process.env.INSTAGRAM_ACCESS_TOKEN,
  );
  const igUserId = ensureEnv(
    "INSTAGRAM_IG_USER_ID",
    process.env.INSTAGRAM_IG_USER_ID,
  );

  const finalCaption = [
    caption?.trim() || "",
    prompt ? `Prompt: ${prompt}` : null,
    style ? `Style: ${style}` : null,
    "#aiart #figuredrawing #digitalart #agentic",
  ]
    .filter(Boolean)
    .join("\n\n");

  const containerParams = new URLSearchParams({
    access_token: accessToken,
    image_url: imageUrl,
    caption: finalCaption,
  });

  const containerResponse = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    {
      method: "POST",
      body: containerParams,
    },
  );

  const containerJson = (await containerResponse.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!containerResponse.ok || !containerJson.id) {
    throw new Error(
      containerJson?.error?.message ||
        `Failed to create Instagram media container (${containerResponse.status}).`,
    );
  }

  const publishParams = new URLSearchParams({
    access_token: accessToken,
    creation_id: containerJson.id,
  });

  const publishResponse = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    {
      method: "POST",
      body: publishParams,
    },
  );

  const publishJson = (await publishResponse.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!publishResponse.ok || !publishJson.id) {
    throw new Error(
      publishJson?.error?.message ||
        `Failed to publish Instagram media (${publishResponse.status}).`,
    );
  }

  return {
    containerId: containerJson.id,
    publishId: publishJson.id,
  };
}


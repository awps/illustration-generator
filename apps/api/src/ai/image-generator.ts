import { GoogleGenAI } from "@google/genai";

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export interface ReferenceImage {
  base64: string;
  mimeType: string;
}

export async function generateImage(
  ai: GoogleGenAI,
  enhancedPrompt: string,
  reference?: ReferenceImage
): Promise<GeneratedImage> {
  const contents: any[] = [];
  if (reference) {
    contents.push({
      inlineData: { mimeType: reference.mimeType, data: reference.base64 },
    });
    contents.push({ text: `Use the reference image above ONLY as a style guide — match its rendering technique, color treatment, and visual aesthetic. Do NOT copy its layout, composition, text, or specific elements. Create a completely new and original illustration for the following: ${enhancedPrompt}` });
  } else {
    contents.push({ text: enhancedPrompt });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents,
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (!parts) {
    const blockReason = candidate?.finishReason
      ?? (response as any).promptFeedback?.blockReason
      ?? "unknown";
    console.error("[image-generator] No content returned. finishReason:", candidate?.finishReason,
      "promptFeedback:", JSON.stringify((response as any).promptFeedback),
      "candidates:", JSON.stringify(response.candidates));
    throw new Error(`Image generation returned no content (reason: ${blockReason})`);
  }

  const imagePart = parts.find((p) =>
    p.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData) {
    throw new Error("Image generation returned no image data");
  }

  return {
    base64: imagePart.inlineData.data!,
    mimeType: imagePart.inlineData.mimeType!,
  };
}

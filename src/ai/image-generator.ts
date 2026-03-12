import { GoogleGenAI } from "@google/genai";

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export async function generateImage(
  ai: GoogleGenAI,
  enhancedPrompt: string
): Promise<GeneratedImage> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: enhancedPrompt,
    config: {
      responseModalities: ["IMAGE"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("Image generation returned no content");
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

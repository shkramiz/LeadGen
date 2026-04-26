import { GoogleGenAI } from "@google/genai";
import { BusinessLead } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function findLeads(keyword: string, location: string, excludeNames: string[] = []): Promise<BusinessLead[]> {
  const model = "gemini-3-flash-preview"; // Recommended for text tasks with tools
  
  const excludePrompt = excludeNames.length > 0 
    ? `\n\nIMPORTANT: Do NOT include these businesses that I already have: ${excludeNames.join(", ")}.`
    : "";

  const prompt = `Find businesses for the keyword "${keyword}" in "${location}". 
  Specifically look for businesses that appear to have NO website and NO social media presence (Instagram, Facebook, etc.).
  For each business, provide:
  1. Name
  2. Full Address
  3. Phone number (if available)
  4. Email address (if available)
  5. WhatsApp number (if available)
  6. Rating and review count
  7. Category
  8. Whether they have a website or social media (true/false)
  
  Format the output as a JSON array of objects with these keys: name, address, phone, email, whatsapp, rating, reviewsCount, category, hasWebsite, websiteUrl.${excludePrompt}
  
  Set hasWebsite to true if they have either a website OR a strong social media presence.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleMaps: {} }],
        // Note: responseMimeType: "application/json" is NOT allowed with googleMaps
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Extract Maps URLs from grounding chunks
    const mapsUrls = groundingChunks
      .filter(chunk => chunk.maps?.uri)
      .map(chunk => ({
        title: chunk.maps?.title || "",
        uri: chunk.maps?.uri || ""
      }));

    // Try to parse the JSON from the text response
    // Since we can't use responseMimeType: "application/json", we have to extract it
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    let leads: BusinessLead[] = [];
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        leads = parsed.map((item: any) => {
          const matchedChunk = mapsUrls.find(chunk => 
            chunk.title.toLowerCase().includes(item.name.toLowerCase()) || 
            item.name.toLowerCase().includes(chunk.title.toLowerCase())
          );
          
          return {
            ...item,
            mapsUrl: matchedChunk?.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + " " + item.address)}`
          };
        });
      } catch (e) {
        console.error("Failed to parse JSON from Gemini response", e);
      }
    }

    // If parsing failed or returned empty, fallback to a more manual extraction if needed
    // but usually the model is good at following the JSON request in text.
    
    return leads;
  } catch (error) {
    console.error("Error in findLeads:", error);
    throw error;
  }
}

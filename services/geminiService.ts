import { GoogleGenAI } from "@google/genai";
import { Client } from '../types';

// Safely access process.env.API_KEY or default to undefined
const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;

let ai: GoogleGenAI | null = null;

// Only initialize AI if key exists. Otherwise app runs in "Offline/Manual" mode.
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.warn("Failed to initialize AI client, falling back to offline mode.");
  }
}

// Offline Templates used when AI is disconnected or no API key is present
const getOfflineTemplate = (client: Client, context: string): string => {
  const firstName = client.name.split(' ')[0];
  const contextLower = context.toLowerCase();

  // Template 1: Rate / Budget Negotiation
  if (contextLower.includes('rate') || contextLower.includes('budget') || contextLower.includes('money')) {
     return `Subject: Rate Inquiry / Project Scope - ${client.name}

Hi ${firstName},

It was great connecting with you regarding the project at ${client.company}.

Based on the scope we discussed, my standard day rate is ${client.rate || '[Your Rate]'}, but I am open to discussing a project-based fee if that aligns better with your budget structure.

Let me know what works best for you.

Best,
[Your Name]`;
  }

  // Template 2: Follow Up / Check In
  if (contextLower.includes('follow') || contextLower.includes('check') || contextLower.includes('status')) {
    return `Subject: Checking in - ${client.company} / ${client.name}

Hi ${firstName},

I hope you're having a great week.

I wanted to quickly follow up on our previous conversation regarding potential collaboration with ${client.company}. 

Since we last spoke on ${client.lastContactDate ? new Date(client.lastContactDate).toLocaleDateString() : 'recently'}, I've been available for new bookings and thought it would be a good time to reconnect.

Do you have any upcoming projects where you might need support?

Best regards,
[Your Name]`;
  }

  // Template 3: Introduction / Cold Outreach
  if (contextLower.includes('intro') || contextLower.includes('new')) {
    return `Subject: VFX/Creative Support for ${client.company}

Hi ${firstName},

I've been following the work at ${client.company} (especially the recent ${client.sector} projects) and wanted to reach out.

I am a freelancer specializing in [Your Specialty] and currently have some availability opening up next month. I'd love to discuss how I could support your team on upcoming deadlines.

You can view my latest reel here: [Link]

Best,
[Your Name]`;
  }

  // Default General Template
  return `Subject: Hello from [Your Name] - ${client.company}

Hi ${firstName},

I hope this email finds you well.

I'm writing to touch base regarding ${context}. 

I currently have availability in my schedule and would love to discuss how I can help with upcoming projects at ${client.company}.

Looking forward to hearing from you.

Best regards,
[Your Name]`;
};

export const generateOutreachEmail = async (client: Client, context: string): Promise<string> => {
  // 1. Try AI First if available
  if (ai) {
    try {
      const model = 'gemini-3-flash-preview';
      const prompt = `
        You are a professional assistant for a VFX/Animation freelancer.
        Write a polite, professional, and concise email to a client.

        Client Name: ${client.name}
        Company: ${client.company}
        Role: ${client.role}
        Sector: ${client.sector}
        Last Contact: ${client.lastContactDate ? new Date(client.lastContactDate).toDateString() : 'Never'}
        Client Notes: ${client.notes}

        Goal of email: ${context}

        Tone: Professional, creative, warm, but concise.
        Do not include subject line placeholders, just give me the subject and the body.
      `;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      return response.text || getOfflineTemplate(client, context);
    } catch (error) {
      console.warn("Gemini API Error (falling back to offline template):", error);
      // Fallback silently to offline template so the app always works
      return getOfflineTemplate(client, context);
    }
  }

  // 2. Fallback to Offline Template immediately if no API key (Offline Mode)
  // This ensures the app works "independently" as requested.
  return getOfflineTemplate(client, context);
};
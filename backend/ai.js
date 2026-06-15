import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in backend/.env!");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Translates natural language description into a MongoDB find query object.
 * @param {string} promptText
 * @returns {Promise<{ query: Object, explanation: string }>}
 */
export async function parseSegmentPrompt(promptText) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const systemInstruction = `
You are a MongoDB query generation assistant for a DTC retail database.
The schema fields you can query on the Customer model are:
- name (string)
- email (string)
- phone (string)
- totalSpend (number, total money spent)
- visits (number, number of orders/visits)
- lastVisitDate (date)

Respond ONLY with a JSON object containing two fields:
1. "query": The MongoDB find() filter object. Ensure MongoDB query operators are correct (e.g. $gt, $lte, $regex).
2. "explanation": A 1-sentence friendly explanation of the segment in English.

Do NOT wrap the output in markdown code blocks like \`\`\`json. Output raw JSON.
Example prompt: "shoppers who spent more than 100 dollars and visited more than 3 times"
Example response:
{
  "query": { "totalSpend": { "$gt": 100 }, "visits": { "$gt": 3 } },
  "explanation": "Customers with total spend greater than $100 and more than 3 visits."
}
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
      systemInstruction: systemInstruction,
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("AI parse segment prompt failed:", error);
    // Fallback: search all if error
    return {
      query: {},
      explanation: "Fallback query: all customers (AI parsing failed)."
    };
  }
}

/**
 * Generates personalized message copies for campaigns.
 * @param {string} prompt
 * @param {string} channel
 * @returns {Promise<string>}
 */
export async function generateCampaignTemplate(prompt, channel) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const systemInstruction = `
You are an expert copywriter creating retail marketing campaigns.
Create a template suitable for the ${channel} channel based on the user's intent.
Use placeholders like [Name], [TotalSpend], [Visits] where personalization should be injected.
Keep it punchy, engaging, and action-oriented. Do not include markdown headers or brackets other than standard variables.
Only return the template text.
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction,
    });

    return result.response.text().trim();
  } catch (error) {
    console.error("AI template generation failed:", error);
    return "Hi [Name], we have special offers just for you! Check them out today.";
  }
}

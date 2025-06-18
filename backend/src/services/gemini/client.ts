// src/services/gemini/client.ts - IMPROVED PROMPTS
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateTestCases = async (apiSpec: string) => {
    try {
        const prompt = `You are a QA automation expert. Generate comprehensive test cases for this API specification.

API Specification:
${apiSpec}

Generate test cases that cover:
1. Happy path scenarios
2. Error cases (404, 400, etc.)  
3. Edge cases and validation

IMPORTANT RULES:
- Respond with ONLY a valid JSON array
- No explanations, markdown, or code blocks
- Use ONLY these assertion patterns:

SUPPORTED ASSERTION PATTERNS:
- "status code should be 200" (or any number)
- "response is an array" 
- "response is an object"
- "response is empty"
- "has property 'id'" (or any property name)
- "contains valid data"
- "array length is 10" (or any number)

EXAMPLE TEST CASE FORMAT:
{
    "name": "Get all posts - success",
    "endpoint": "/posts",
    "method": "GET", 
    "params": {},
    "expectedStatus": 200,
    "assertions": [
        "status code should be 200",
        "response is an array",
        "has property 'id'",
        "has property 'title'"
    ]
}

For the given API spec, generate test cases for:
- All defined endpoints
- Success scenarios (200, 201)
- Error scenarios (404 for non-existent resources, 400 for invalid data)
- Include realistic edge cases

Return the JSON array:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('🤖 Raw AI response length:', text.length);
        console.log('🤖 Raw AI response preview:', text.substring(0, 300) + '...');
        
        // 🔧 ROBUST JSON EXTRACTION
        const jsonMatch = extractJsonFromText(text);
        
        if (jsonMatch) {
            console.log('✅ Successfully extracted JSON from AI response');
            return jsonMatch;
        } else {
            console.log('❌ No valid JSON found in AI response');
            throw new Error('AI response did not contain valid JSON');
        }
        
    } catch (error) {
        console.error('Error generating test cases with Gemini:', error);
        throw error;
    }
};

function extractJsonFromText(text: string): string | null {
    try {
        // Method 1: Try to parse the text directly (if it's already clean JSON)
        const trimmed = text.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            JSON.parse(trimmed);
            return trimmed;
        }
    } catch (e) {
        // Continue to other methods
    }

    try {
        // Method 2: Extract JSON from markdown code blocks
        const codeBlockMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (codeBlockMatch) {
            JSON.parse(codeBlockMatch[1]);
            return codeBlockMatch[1];
        }
    } catch (e) {
        // Continue to other methods
    }

    try {
        // Method 3: Find JSON array in text (look for [ ... ])
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            JSON.parse(arrayMatch[0]);
            return arrayMatch[0];
        }
    } catch (e) {
        // Continue to other methods
    }

    try {
        // Method 4: Try to find content between first [ and last ]
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
            const extracted = text.substring(firstBracket, lastBracket + 1);
            JSON.parse(extracted);
            return extracted;
        }
    } catch (e) {
        // Continue to other methods
    }

    try {
        // Method 5: Clean up common issues and try again
        let cleaned = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
            .replace(/\/\/.*$/gm, '') // Remove // comments
            .trim();
            
        const cleanArrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (cleanArrayMatch) {
            JSON.parse(cleanArrayMatch[0]);
            return cleanArrayMatch[0];
        }
    } catch (e) {
        // Final attempt failed
    }
    
    console.log('❌ All JSON extraction methods failed');
    console.log('📝 Full AI response:', text);
    return null;
}
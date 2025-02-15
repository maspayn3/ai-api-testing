// src/services/gemini/client.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export const generateTestCases = async (apiSpec: string) => {
    try {
        const prompt = `As a QA automation expert, analyze this OpenAPI specification and generate test cases ONLY for the endpoints and parameters that are explicitly defined in the spec:
        ${apiSpec}
        
        For each endpoint, generate test cases covering:
        1. Happy path scenarios
        2. Error cases ONLY for defined error responses
        3. Edge cases for defined parameters
        4. Input validation for defined parameters
        
        IMPORTANT: Only include parameters and status codes that are explicitly defined in the API spec.
        
        Format each test case as a JSON object with:
        {
            "name": "descriptive test name",
            "endpoint": "endpoint path",
            "method": "HTTP method",
            "params": {
                // ONLY include parameters defined in the spec
            },
            "expectedStatus": 200, // ONLY use status codes defined in the spec
            "assertions": [
                // assertions based on defined response schemas and descriptions
            ]
        }
        
        Return a JSON array of test cases.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating test cases with Gemini:', error);
        throw error;
    }
};
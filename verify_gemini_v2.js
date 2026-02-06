const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Load env
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });

        // Also try .env.local
        try {
            const envLocalPath = path.resolve(process.cwd(), '.env.local');
            const envLocalConfig = fs.readFileSync(envLocalPath, 'utf8');
            envLocalConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            });
        } catch (e) { }

    } catch (e) {
        console.error("Could not load .env file");
    }
}

loadEnv();

async function testModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("API Key loaded:", apiKey ? "Yes (starts with " + apiKey.substring(0, 4) + ")" : "No");

    if (!apiKey) {
        console.error("No API Key found. Exiting.");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log("Testing gemini-flash-latest...");
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent("Say hello");
        console.log("Success with gemini-flash-latest:", result.response.text());
    } catch (error) {
        console.error("Error with gemini-flash-latest:", error.message);
    }

    try {
        console.log("Testing gemini-1.5-flash...");
        const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result2 = await model2.generateContent("Say hello");
        console.log("Success with gemini-1.5-flash:", result2.response.text());
    } catch (e2) {
        console.error("Error with gemini-1.5-flash:", e2.message);
    }
}

testModel();

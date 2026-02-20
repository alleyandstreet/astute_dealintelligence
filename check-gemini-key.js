const fs = require('fs');
const path = require('path');

function checkGeminiEnv() {
    console.log("Checking GEMINI_API_KEY...");

    // Load .env
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            });
        }
    } catch (e) { }

    // Load .env.local
    try {
        const envLocalPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envLocalPath)) {
            const envConfig = fs.readFileSync(envLocalPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            });
        }
    } catch (e) { }

    const key = process.env.GEMINI_API_KEY;
    if (key) {
        console.log(`GEMINI_API_KEY is SET (length: ${key.length}, starts with: ${key.substring(0, 4)}...)`);
    } else {
        console.log("GEMINI_API_KEY is NOT SET");
    }
}

checkGeminiEnv();

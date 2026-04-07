/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function checkEnv() {
    console.log("Checking environment variables...");
    
    // Load .env
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            console.log(".env file found.");
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            });
        } else {
            console.log(".env file NOT found.");
        }
    } catch (e) {
        console.error("Error reading .env:", e);
    }

    // Load .env.local
    try {
        const envLocalPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envLocalPath)) {
            console.log(".env.local file found.");
             const envConfig = fs.readFileSync(envLocalPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            });
        }
    } catch {}

    const vars = [
        'DATABASE_URL',
        'NEXTAUTH_URL',
        'NEXTAUTH_SECRET',
        'GEMINI_API_KEY',
        'OPENAI_API_KEY',
        'ADMIN_USERNAME',
        'ADMIN_PASSWORD'
    ];

    vars.forEach(v => {
        const val = process.env[v];
        console.log(`${v}: ${val ? 'SET (length ' + val.length + ')' : 'NOT SET'}`);
    });
}

checkEnv();

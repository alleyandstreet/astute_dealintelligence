import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function getOpenAICompletion(prompt: string, model: string = "gpt-4o") {
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI error:", error);
        throw new Error("Failed to get completion from OpenAI");
    }
}

export default openai;

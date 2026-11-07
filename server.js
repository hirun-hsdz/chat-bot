
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const MODEL = "gemini-3.8-flash";

const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/interactions";

// Delay helper
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Gemini API request with retry
async function requestGemini(body) {

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": process.env.GEMINI_API_KEY
            },

            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            return { response, data };
        }

        // Retry temporary server overload or rate limit
        if (
            (response.status === 503 || response.status === 429) &&
            attempt < maxAttempts
        ) {

            console.log(
                `Gemini busy. Retrying (${attempt + 1}/${maxAttempts})...`
            );

            await wait(1000 * Math.pow(2, attempt - 1));

            continue;
        }

        return { response, data };
    }
}

// Chat API
app.post("/api/chat", async (req, res) => {

    try {

        const { message, previousInteractionId } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                error: "API Key is missing in .env file."
            });
        }

        if (
            !message ||
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                error: "Please enter a message."
            });
        }

        const requestBody = {
            model: MODEL,
            input: message.trim()
        };

        if (previousInteractionId) {
            requestBody.previous_interaction_id =
                previousInteractionId;
        }

        const { response, data } = await requestGemini(requestBody);

        if (!response.ok) {

            console.error("Gemini API Error:", data);

            return res.status(response.status).json({
                error: data.error?.message ||
                    "Gemini is temporarily unavailable. Please try again."
            });
        }

        const reply =
            data.output_text ||
            (data.steps || [])
                .filter(step => step.type === "model_output")
                .flatMap(step => step.content || [])
                .filter(item => item.type === "text")
                .map(item => item.text)
                .join("");

        if (!reply) {
            return res.status(502).json({
                error: "Gemini returned an empty response."
            });
        }

        res.json({
            reply: reply,
            interactionId: data.id
        });

    } catch (error) {

        console.error("Server Error:", error);

        res.status(500).json({
            error: "Server error. Please try again."
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(
        `Gemini AI running at http://localhost:${PORT}`
    );
});

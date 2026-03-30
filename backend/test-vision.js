const { OpenAI } = require('openai');
const path = require('path');
const fs = require('fs');

const openai = new OpenAI({
    apiKey: "sk-xhrBfb1VOc2X4FKeoCSl5yvOsnPAQ74GIRp5obeqcgf7M2lM",
    baseURL: "https://api.moonshot.cn/v1",
});

async function test() {
    try {
        const res = await openai.chat.completions.create({
            model: "moonshot-v1-8k-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "what is this?" },
                        { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==" } }
                    ]
                }
            ]
        });
        console.log(JSON.stringify(res.choices[0].message, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
    }
}
test();

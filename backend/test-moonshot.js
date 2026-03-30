const { OpenAI } = require('openai');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: "sk-xhrBfb1VOc2X4FKeoCSl5yvOsnPAQ74GIRp5obeqcgf7M2lM",
  baseURL: "https://api.moonshot.cn/v1",
});

async function run() {
  try {
    const completion = await openai.chat.completions.create({
      model: "moonshot-v1-8k-vision-preview",
      messages: [
        { role: "user", content: "test" }
      ]
    });
    console.log("Success:", completion.choices[0].message.content);
  } catch (err) {
    console.error("Error calling vision API:", err.message, err.response?.data);
  }
}
run();

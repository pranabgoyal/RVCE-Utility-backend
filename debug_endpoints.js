const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testMockPapers() {
    console.log("--- Testing Mock Papers Endpoint ---");
    try {
        const url = `${BASE_URL}/github/mock-papers`;
        console.log(`GET ${url}`);
        const res = await axios.get(url);
        console.log(`✅ Status: ${res.status}`);
        console.log(`Found ${res.data.length} items`);
    } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        if (err.response) console.log(err.response.data);
    }
}

async function testAIChat() {
    console.log("\n--- Testing AI Chat Endpoint ---");
    try {
        const url = `${BASE_URL}/ai/chat`;
        console.log(`POST ${url}`);
        const payload = {
            message: "Hello, are you working?",
            context: { title: "TestContext" }
        };
        const res = await axios.post(url, payload);
        console.log(`✅ Status: ${res.status}`);
        console.log(`Reply: ${res.data.reply}`);
    } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        if (err.response) console.log(err.response.data);
    }
}

async function run() {
    await testMockPapers();
    await testAIChat();
}

run();

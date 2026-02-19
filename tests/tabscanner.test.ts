import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const API_URL = 'http://localhost:3000/api/tabscanner'; // Adjust if running on different port/host
const MOCK_IMAGE_PATH = path.join(__dirname, 'mock_receipt.jpg');

// Ensure a mock image exists for testing
if (!fs.existsSync(MOCK_IMAGE_PATH)) {
    // Create a dummy 1x1 pixel JPEG if not exists
    const dummyJpeg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    fs.writeFileSync(MOCK_IMAGE_PATH, dummyJpeg);
}

const imageBase64 = fs.readFileSync(MOCK_IMAGE_PATH, { encoding: 'base64' });

async function runTests() {
    console.log('🚀 Starting Tabscanner Integration Tests...\n');
    let passed = 0;
    let failed = 0;

    async function test(name: string, fn: () => Promise<void>) {
        try {
            process.stdout.write(`⏳ Testing: ${name}... `);
            await fn();
            console.log('✅ PASS');
            passed++;
        } catch (error: any) {
            console.log('❌ FAIL');
            console.error(`   Error: ${error.message}`);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Data:`, error.response.data);
            }
            failed++;
        }
    }

    // 1. Happy Path: Upload and Poll (Mocked if no real key)
    // Note: This test assumes the server is running and keys are valid or mocked
    await test('Happy Path: Upload -> Poll', async () => {
        // Step A: Upload
        const uploadRes = await axios.post(API_URL, {
            action: 'upload',
            imageBase64: imageBase64
        });

        if (!uploadRes.data.token) throw new Error('No token returned from upload');
        const token = uploadRes.data.token;

        // Step B: Poll
        let status = 'PENDING';
        let retries = 0;
        while (status === 'PENDING' && retries < 5) {
            await new Promise(r => setTimeout(r, 1000));
            const pollRes = await axios.post(API_URL, {
                action: 'poll',
                token: token
            });
            status = pollRes.data.status;
            retries++;
        }

        if (status !== 'DONE' && status !== 'PENDING') throw new Error(`Unexpected status: ${status}`);
    });

    // 2. Error Scenario: Missing Image
    await test('Error: Missing Image', async () => {
        try {
            await axios.post(API_URL, { action: 'upload' });
            throw new Error('Should have failed 400');
        } catch (e: any) {
            if (e.response?.status !== 400) throw e;
        }
    });

    // 3. Error Scenario: Invalid Action
    await test('Error: Invalid Action', async () => {
        try {
            await axios.post(API_URL, { action: 'invalid_action' });
            throw new Error('Should have failed 400');
        } catch (e: any) {
            if (e.response?.status !== 400) throw e;
        }
    });

    // Summary
    console.log('\n---------------------------------------------------');
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests();

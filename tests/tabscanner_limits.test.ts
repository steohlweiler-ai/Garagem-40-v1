import { kv } from '@vercel/kv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Load env vars if needed (test requires KV_REST_API_URL and KV_REST_API_TOKEN)
require('dotenv').config();

const API_URL = 'http://localhost:3000/api/tabscanner';
const USAGE_URL = 'http://localhost:3000/api/usage';
const MOCK_IMAGE_PATH = path.join(__dirname, 'mock_receipt.jpg');

// Ensure a mock image exists for testing
if (!fs.existsSync(MOCK_IMAGE_PATH)) {
    const dummyJpeg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    fs.writeFileSync(MOCK_IMAGE_PATH, dummyJpeg);
}

const imageBase64 = fs.readFileSync(MOCK_IMAGE_PATH, { encoding: 'base64' });

async function runTests() {
    console.log('🚀 Starting Tabscanner Limits & Usage API Tests...\n');
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

    const date = new Date();
    const monthKey = `tabscanner:usage:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    let originalUsage = 0;

    // 1. Fetch current usage via internal endpoint
    await test('Fetch current usage from /api/usage', async () => {
        const res = await axios.get(USAGE_URL);
        if (typeof res.data.usage !== 'number') throw new Error('Invalid usage data returned');
        originalUsage = res.data.usage;
        console.log(`\n      Current usage: ${originalUsage} / ${res.data.limit}`);
    });

    // 2. Mock usage to warning threshold (180)
    await test('Trigger Warning Threshold (KV Set to 180)', async () => {
        await kv.set(monthKey, 180);

        // Ensure to delete or reset back later
        const uploadRes = await axios.post(API_URL, {
            action: 'upload',
            imageBase64: imageBase64
        });

        // if it responds 200, it should include a warning (unless it was a cache hit)
        if (!uploadRes.data.warning && !uploadRes.data.cached) {
            throw new Error('Expected warning flag in response since usage was 180');
        }
    });

    // 3. Mock usage to limit (200) and verify fallback
    await test('Trigger Limit Block & Verify Fallback (KV Set to 200)', async () => {
        await kv.set(monthKey, 200);

        // This should trigger the block mechanism and fallback to OCR.space
        const uploadRes = await axios.post(API_URL, {
            action: 'upload',
            imageBase64: imageBase64
        });

        if (uploadRes.data.status !== 'DONE' || !uploadRes.data.data?.result?.fallback) {
            throw new Error('Expected fallback response structure');
        }
    });

    // Restore KV usage to avoid breaking the user's real counter in test
    await test('Restore Original Usage', async () => {
        if (originalUsage > 0) {
            await kv.set(monthKey, originalUsage);
        } else {
            await kv.del(monthKey);
        }
    });

    console.log('\n---------------------------------------------------');
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests();

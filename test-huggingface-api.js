#!/usr/bin/env node

// Simple test script to check Hugging Face API functionality
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    }
  } catch (error) {
    console.log(`Could not load ${filePath}:`, error.message);
  }
}

// Load .env.local
loadEnvFile(path.join(__dirname, '.env.local'));

async function testHuggingFaceAPI() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  console.log('Testing Hugging Face API...');
  console.log('API Key present:', !!apiKey);
  console.log('API Key length:', apiKey?.length);
  console.log('API Key starts with:', apiKey?.substring(0, 10) + '...');

  if (!apiKey) {
    console.error('❌ No API key found');
    return;
  }

  // Create a simple test image (1x1 pixel white image)
  const testImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB//2Q==';

  // Convert base64 to buffer
  const base64Data = testImageBase64.replace(/^data:image\/jpeg;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  try {
    console.log('Making API request...');

    const response = await fetch('https://router.huggingface.co/hf-inference/models/nateraw/vit-base-beans', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ API Success!');
    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testHuggingFaceAPI();
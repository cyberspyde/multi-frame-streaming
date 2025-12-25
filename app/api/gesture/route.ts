import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY
    console.log('HUGGINGFACE_API_KEY:', apiKey ? 'Set' : 'Not set')
    console.log('API Key length:', apiKey?.length)

    if (!apiKey) {
      return NextResponse.json({ error: 'Hugging Face API key not configured' }, { status: 500 })
    }

    const { imageData } = await request.json()

    if (!imageData) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 })
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Use Hugging Face API directly with fetch
    const response = await fetch('https://router.huggingface.co/hf-inference/models/nateraw/vit-base-beans', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/octet-stream', // Send raw bytes
      },
      body: buffer, // Send buffer directly
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Hugging Face API response:', response.status, errorText)
      throw new Error(`Hugging Face API error: ${response.status}`)
    }

    const result = await response.json()
    return NextResponse.json({ result })
  } catch (error) {
    console.error('Hugging Face API error:', error)
    return NextResponse.json(
      { error: 'Failed to process gesture' },
      { status: 500 }
    )
  }
}
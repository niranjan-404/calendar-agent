import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Optional: Configure token expiration (default is 10 minutes)
        expires_after: {
          anchor: 'created_at',
          seconds: 600  // 10 minutes
        },
        // Session configuration
        session: {
          type: 'realtime',
          model: 'gpt-realtime',  
          instructions: 'You are a friendly calendar assistant.',
          // Optional: Configure audio settings
          audio: {
            input: {
              format: {
                type: 'audio/pcm',
                rate: 24000
              }
            },
            output: {
              format: {
                type: 'audio/pcm',
                rate: 24000
              },
              voice: 'verse'
            }
          },
          output_modalities: ['audio']
        }
      })
    });

    const raw = await response.text();

    if (!response.ok) {
      console.error('Failed to create client secret:', response.status, raw);
      try {
        const parsedErr = JSON.parse(raw);
        return NextResponse.json({ error: parsedErr }, { status: response.status });
      } catch (e) {
        return NextResponse.json({ error: raw }, { status: response.status });
      }
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse client secret response:', raw);
      return NextResponse.json({ error: 'Invalid response from OpenAI' }, { status: 500 });
    }

    // The API returns { value: "ek_...", expires_at: ..., session: {...} }
    // NOT { client_secret: { value: "ek_..." } }
    if (!data?.value) {
      console.error('Unexpected client secret response shape:', data);
      return NextResponse.json({ error: 'Invalid client secret data returned from OpenAI' }, { status: 500 });
    }

    // Return the ephemeral key directly from the 'value' field
    return NextResponse.json({
      client_secret: data.value,  
      expires_at: data.expires_at,
      session: data.session
    });

  } catch (error) {
    console.error('Client secret creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create client secret' },
      { status: 500 }
    );
  }
}
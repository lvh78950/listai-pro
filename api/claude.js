export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, max_tokens } = req.body;
    
    // Convertit le format Anthropic vers Mistral
    const mistralMessages = messages.map(msg => {
      if (Array.isArray(msg.content)) {
        const textParts = msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
        const imageParts = msg.content.filter(c => c.type === 'image');
        if (imageParts.length > 0) {
          return {
            role: msg.role,
            content: [
              ...imageParts.map(img => ({
                type: 'image_url',
                image_url: `data:${img.source.media_type};base64,${img.source.data}`
              })),
              { type: 'text', text: textParts }
            ]
          };
        }
        return { role: msg.role, content: textParts };
      }
      return { role: msg.role, content: msg.content };
    });

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: mistralMessages,
        max_tokens: max_tokens || 1200,
      }),
    });

    const data = await response.json();
    
    // Convertit la réponse Mistral vers le format Anthropic
    const text = data.choices?.[0]?.message?.content || '';
    res.status(200).json({
      content: [{ type: 'text', text }]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

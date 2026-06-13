exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const { exercise } = JSON.parse(event.body);

  const prompt = `Create a minimal SVG stick figure illustration of someone performing "${exercise}".
Use dark background (#111111), lime green (#C8F135) for the figure, white (#FFFFFF) for equipment.
SVG must be viewBox="0 0 80 80". Make it clean and recognisable.
Also write a 1-sentence technique tip.
Respond ONLY with JSON: {"svg": "<svg viewBox=\\"0 0 80 80\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>", "tip": "one sentence tip here"}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    const text = data.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const parsed = JSON.parse(match[0]);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

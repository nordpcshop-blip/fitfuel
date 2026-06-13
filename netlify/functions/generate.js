exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { age, gender, weight, height, goal, activity, days, equipment, experience } = body;

  const goalLabel = { lose: 'fat loss (cut)', build: 'muscle building (bulk)', maintain: 'maintenance/recomp' }[goal];
  const equipLabel = { full: 'full gym with barbells and machines', dumbbells: 'dumbbells only', bodyweight: 'no equipment, bodyweight only', home: 'home gym setup' }[equipment];

  const prompt = `You are an expert fitness coach and nutritionist. Generate a personalised fitness plan for this person:

- Age: ${age}
- Gender: ${gender}
- Weight: ${weight}kg
- Height: ${height}cm
- Goal: ${goalLabel}
- Activity level outside gym: ${activity}
- Training days per week: ${days}
- Equipment: ${equipLabel}
- Experience: ${experience}

Respond ONLY with a valid JSON object in exactly this format, no other text:
{
  "macros": {
    "calories": 2200,
    "protein": 180,
    "carbs": 220,
    "fat": 70
  },
  "meals": [
    { "name": "Breakfast - oats + banana + protein shake", "cals": 550 },
    { "name": "Lunch - chicken breast + rice + broccoli", "cals": 700 },
    { "name": "Snack - greek yogurt + berries", "cals": 250 },
    { "name": "Dinner - salmon + sweet potato + salad", "cals": 700 }
  ],
  "workout": [
    { "day": "Monday", "focus": "Push", "type": "strength", "exercises": [{ "name": "Bench press", "sets": "4 x 8" }] },
    { "day": "Tuesday", "focus": "Pull", "type": "strength", "exercises": [{ "name": "Deadlift", "sets": "4 x 5" }] },
    { "day": "Wednesday", "focus": "Rest", "type": "rest", "exercises": [{ "name": "Light stretching", "sets": "20 min" }] },
    { "day": "Thursday", "focus": "Legs", "type": "strength", "exercises": [{ "name": "Squat", "sets": "4 x 8" }] },
    { "day": "Friday", "focus": "Upper", "type": "strength", "exercises": [{ "name": "Overhead press", "sets": "4 x 8" }] },
    { "day": "Saturday", "focus": "Cardio", "type": "cardio", "exercises": [{ "name": "Run", "sets": "30 min" }] },
    { "day": "Sunday", "focus": "Rest", "type": "rest", "exercises": [{ "name": "Foam rolling", "sets": "15 min" }] }
  ],
  "tips": [
    "Tip 1 specific to this person",
    "Tip 2 specific to this person",
    "Tip 3 specific to this person"
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'Anthropic error: ' + err }) };
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Bad AI response: ' + text }) };
    }

    const plan = JSON.parse(jsonMatch[0]);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan)
    };

  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

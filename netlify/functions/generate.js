exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { age, gender, weight, height, goal, activity, days, equipment, experience } = body;
  const goalLabel = { lose: 'fat loss (cut)', build: 'muscle building (bulk)', maintain: 'maintenance/recomp' }[goal];
  const equipLabel = { full: 'full gym with barbells and machines', dumbbells: 'dumbbells only', bodyweight: 'no equipment, bodyweight only', home: 'home gym setup' }[equipment];

  const prompt = `You are an expert fitness coach and nutritionist. Generate a Week 1 fitness plan for:
- Age: ${age}, Gender: ${gender}, Weight: ${weight}kg, Height: ${height}cm
- Goal: ${goalLabel}, Activity outside gym: ${activity}
- Training days/week: ${days}, Equipment: ${equipLabel}, Experience: ${experience}

Calculate TDEE using Mifflin-St Jeor. Adjust: cut=-400kcal, bulk=+250kcal, maintain=TDEE.

Respond ONLY with valid JSON, no other text:
{
  "macros": { "calories": 2200, "protein": 180, "carbs": 220, "fat": 70 },
  "meals": [
    {
      "day": "Monday",
      "items": [
        { "name": "Breakfast — oats + banana + protein shake", "cals": 550 },
        { "name": "Lunch — chicken breast + rice + broccoli", "cals": 700 },
        { "name": "Snack — greek yogurt + berries", "cals": 250 },
        { "name": "Dinner — salmon + sweet potato + salad", "cals": 700 }
      ]
    }
  ],
  "workout": [
    { "day": "Monday", "focus": "Push", "type": "strength", "exercises": [{ "name": "Bench press", "sets": "4 x 8" }, { "name": "Overhead press", "sets": "3 x 10" }, { "name": "Tricep pushdown", "sets": "3 x 12" }] },
    { "day": "Tuesday", "focus": "Pull", "type": "strength", "exercises": [{ "name": "Deadlift", "sets": "4 x 5" }, { "name": "Barbell row", "sets": "3 x 10" }, { "name": "Bicep curls", "sets": "3 x 12" }] },
    { "day": "Wednesday", "focus": "Rest", "type": "rest", "exercises": [{ "name": "Light stretching", "sets": "20 min" }] },
    { "day": "Thursday", "focus": "Legs", "type": "strength", "exercises": [{ "name": "Squat", "sets": "4 x 8" }, { "name": "Leg press", "sets": "3 x 12" }, { "name": "Calf raises", "sets": "4 x 15" }] },
    { "day": "Friday", "focus": "Upper", "type": "strength", "exercises": [{ "name": "Incline press", "sets": "4 x 8" }, { "name": "Pull-ups", "sets": "3 x 8" }, { "name": "Lateral raises", "sets": "3 x 15" }] },
    { "day": "Saturday", "focus": "Cardio", "type": "cardio", "exercises": [{ "name": "Steady state run", "sets": "30 min" }] },
    { "day": "Sunday", "focus": "Rest", "type": "rest", "exercises": [{ "name": "Foam rolling", "sets": "15 min" }] }
  ],
  "tips": [
    "Personalised tip 1 for this person",
    "Personalised tip 2",
    "Personalised tip 3"
  ]
}

Rules:
- meals array must have exactly 1 item (Monday/Day 1 only — rest is Pro)
- workout must have exactly 7 days
- exercises should match the equipment available
- tips must be specific to this person's stats and goal
- protein ~2g/kg for bulk, ~1.8g for cut, ~1.6g for maintain`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) { const e=await response.text(); return { statusCode:500, body:JSON.stringify({error:'Anthropic: '+e}) }; }
    const data = await response.json();
    const text = data.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { statusCode:500, body:JSON.stringify({error:'Bad AI response'}) };
    const plan = JSON.parse(jsonMatch[0]);
    return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify(plan) };
  } catch(err) {
    return { statusCode:500, body:JSON.stringify({error:err.message}) };
  }
};

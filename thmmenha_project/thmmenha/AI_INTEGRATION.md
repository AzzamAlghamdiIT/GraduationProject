# 🤖 AI Integration Guide — THMMENHA

## How to Integrate an LLM into THMMENHA

Once your project is live, you can add AI-powered fallback estimation when:
- A car make/model is not found in the dataset
- The data is incomplete or ambiguous
- You want a "second opinion" narrative explanation

---

## Where to Call AI

### 1. Price Estimation Fallback (`js/app.js`)

In `runEstimation()`, when `result` is null (car not found), instead of just showing the "not found" card, you can call an LLM:

```javascript
if (!result) {
  // Current: show not-found card
  // Future: call AI estimation
  const aiResult = await callAIEstimation({ make, model, trim, year, mileage, accident });
  renderAIEstimate(aiResult);
  return;
}
```

---

## Example: Using Claude API (Anthropic)

```javascript
async function callAIEstimation({ make, model, trim, year, mileage, accident }) {
  const prompt = `
You are an expert Saudi Arabian used car market appraiser.
Estimate the current market value for this vehicle:

- Make: ${make}
- Model: ${model}
- Trim: ${trim || 'Unknown'}
- Year: ${year}
- Mileage: ${mileage} km
- Accident History: ${accident}

Respond ONLY in this JSON format:
{
  "estimatedPrice": <number in SAR>,
  "rangeLow": <number>,
  "rangeHigh": <number>,
  "confidence": "low|medium|high",
  "rationale": "<2-3 sentence explanation>",
  "similarCar": "<suggest a similar listed car if applicable>"
}
  `.trim();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'YOUR_API_KEY_HERE',  // ⚠️ Use a backend proxy in production
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content[0].text;
  return JSON.parse(text);
}
```

---

## ⚠️ IMPORTANT SECURITY NOTE

**Never expose your API key in frontend JavaScript.** Anyone can see it in DevTools.

**Production solution:** Use a simple Firebase Cloud Function as a proxy:

```javascript
// functions/index.js (Firebase Cloud Function)
exports.estimatePrice = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CLAUDE_API_KEY,  // stored as env variable
      // ...
    },
    body: JSON.stringify({ /* prompt */ })
  });
  
  return await response.json();
});
```

---

## Using OpenAI GPT Instead

```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a Saudi Arabia used car market appraiser.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  })
});
```

---

## What the AI Can Do

| Use Case | Benefit |
|---|---|
| Unknown car make/model | AI uses general knowledge to estimate |
| Incomplete data | AI infers from partial info |
| Narrative explanation | "Why is your car worth X?" |
| Suggest similar cars | "Closest match in our database is Y" |
| Market commentary | "Toyotas hold value well in KSA because…" |

---

## Recommended LLM Providers

| Provider | Best For | Notes |
|---|---|---|
| Anthropic Claude | Nuanced reasoning, Arabic support | Strong JSON output |
| OpenAI GPT-4o | Broad knowledge, fast | Most popular |
| Google Gemini | Free tier available | Good for prototyping |

---

*For questions, contact: thmmenha@gmail.com*

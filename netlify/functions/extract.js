// CorpoFin — netlify/functions/extract.js
// Powered by Google Gemini API (Free tier — 1500 requests/day)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: "GEMINI_API_KEY not set in Netlify environment variables." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  const { company, year, sector, currency, pdfBase64 } = body;

  if (!company || !year) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Company and year required" }) };
  }

  // Build Gemini parts array
  const parts = [];

  // Attach PDF if provided
  if (pdfBase64) {
    parts.push({
      inline_data: {
        mime_type: "application/pdf",
        data: pdfBase64,
      },
    });
  }

  const promptText = `You are a senior Indian equity research analyst with deep expertise in reading annual reports and financial statements.

${pdfBase64
  ? "The annual report PDF is attached above. Extract ALL financial data STRICTLY from this document only."
  : `No PDF uploaded. Use your knowledge and search the internet for the most accurate and latest financial data for ${company} for ${year}. Pull data from sources like Screener.in, MoneyControl, NSE, BSE, and the company's investor relations page.`
}

Company: ${company}
Financial Year: ${year}
Sector: ${sector || "General"}
Currency Unit: ${currency || "Crores (Rs Cr)"}

Extract the following and return ONLY a raw JSON object — absolutely no markdown, no backticks, no explanation before or after the JSON:

{
  "summary": {
    "total_revenue": "actual value with unit e.g. Rs 63,672 Cr",
    "revenue_growth": "+24.2% YoY",
    "gross_profit_margin": "11.83%",
    "ebitda": "actual value with unit",
    "ebitda_margin": "3.90%",
    "net_profit": "actual value with unit",
    "net_profit_margin": "1.92%",
    "eps": "Rs 9.42",
    "return_on_equity": "13.81%",
    "return_on_capital_employed": "19.48%",
    "debt_to_equity": "0.18x",
    "current_ratio": "1.25x"
  },
  "trend_table": {
    "years": ["FY22","FY23","FY24","FY25","FY26"],
    "revenue": ["54214","58185","51262","63672","74731"],
    "ebitda_margin": ["3.20%","2.85%","2.21%","3.90%","2.85%"],
    "net_profit_margin": ["1.48%","1.00%","0.50%","1.92%","1.40%"],
    "roe": ["—","7.38%","3.09%","13.81%","10.52%"]
  },
  "key_insights": [
    "Specific insight about revenue growth with actual numbers",
    "Specific insight about margin trends",
    "Specific insight about balance sheet strength",
    "Specific insight about outlook or key risks"
  ]
}`;

  parts.push({ text: promptText });

  // Use gemini-1.5-flash — free, fast, reads PDFs, has internet knowledge
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!res.ok) {
      let msg = `Gemini API error ${res.status}`;
      try {
        const e = await res.json();
        msg = e.error?.message || msg;
      } catch {}
      if (res.status === 400) msg = "Invalid request. Check your API key or try a smaller PDF.";
      if (res.status === 403) msg = "Invalid Gemini API key. Check GEMINI_API_KEY in Netlify environment variables.";
      if (res.status === 429) msg = "Gemini free tier limit reached. Try again in a minute.";
      return { statusCode: res.status, headers: CORS, body: JSON.stringify({ error: msg }) };
    }

    const data = await res.json();

    // Extract text from Gemini response
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!raw) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Empty response from Gemini. Please try again." }) };
    }

    // Clean any accidental markdown fences
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Could not parse AI response. Please try again." }) };
        }
      } else {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "AI response was not valid JSON. Please try again." }) };
      }
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify(parsed) };

  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Server error: " + err.message }) };
  }
};

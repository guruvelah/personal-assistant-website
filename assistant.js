const db = require('./db');
const mongo = require('./mongo');

async function askAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`[Anthropic] Request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text;
    }
    return null;
  } catch (err) {
    console.warn('[Anthropic] Call timed out or failed:', err.message);
    return null;
  }
}

async function handleMessage(userMessage, sessionId = 'default-session') {
  const clean = (userMessage || '').trim();
  if (!clean) {
    return {
      type: 'error',
      reply: 'Please provide a question or error code to look up.'
    };
  }

  let result = null;

  // 1. Check for Error Code match (e.g. "What does 429 mean?", "404", "APP-1001", "error 500")
  const errorCodeRegex = /\b(APP-1001|APP-2001|400|401|403|404|429|500|503)\b/i;
  const errorMatch = clean.match(errorCodeRegex);
  if (errorMatch) {
    const code = errorMatch[1].toUpperCase();
    const errRecord = db.getErrorCode(code);
    if (errRecord) {
      result = {
        type: 'error_code',
        code: errRecord.code,
        title: errRecord.title,
        reply: `Error ${errRecord.code} (${errRecord.title}): ${errRecord.description}\n\nResolution: ${errRecord.resolution}`
      };
    }
  }

  // 2. Check for FAQ match if not resolved by error code
  if (!result) {
    const faqRecord = db.searchFaq(clean);
    if (faqRecord) {
      result = {
        type: 'faq',
        question: faqRecord.question,
        reply: faqRecord.answer
      };
    }
  }

  // 3. Optional Anthropic API check (if configured and previous checks didn't match)
  if (!result && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '') {
    const aiText = await askAnthropic(clean);
    if (aiText) {
      result = {
        type: 'ai',
        reply: aiText
      };
    }
  }

  // 4. Fallback: Cannot answer -> Automatically create support ticket
  if (!result) {
    const ticket = db.createTicket({
      name: 'Chat Visitor',
      email: 'chat-visitor@support.local',
      subject: `Assistant Inquiry: "${clean.slice(0, 40)}"`,
      message: clean
    });

    result = {
      type: 'ticket',
      ticketId: ticket.ticket_number,
      reply: `I could not find an exact match in our FAQs or error codes for "${clean}". I have automatically created support ticket #${ticket.ticket_number} for you. Our team will review it shortly!`
    };
  }

  // 5. Asynchronously log interaction to MongoDB
  const mongoLog = await mongo.logChat({
    sessionId,
    userMessage: clean,
    assistantResponse: result.reply,
    responseType: result.type,
    ticketId: result.ticketId || null
  });

  result.logId = mongoLog.logId;
  return result;
}

module.exports = {
  handleMessage,
  askAnthropic
};

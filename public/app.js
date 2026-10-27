document.addEventListener('DOMContentLoaded', () => {
  // 1. Weather Integration
  initWeather();

  // 2. Chat Assistant Drawer & Controls
  initAssistant();

  // 3. Contact Form Submission
  initContactForm();
});

// Weather fetcher with fallback handling
async function initWeather() {
  const badge = document.getElementById('weather-badge');
  if (!badge) return;

  try {
    const res = await fetch('/api/weather');
    if (!res.ok) throw new Error('Network response failed');
    const data = await res.json();

    const temp = data.temperature !== undefined ? `${data.temperature}${data.unit || '°C'}` : '28°C';
    const city = data.city || 'Chennai';
    const isFallback = data.fallback ? ' (Offline mode)' : '';

    badge.innerHTML = `
      <span class="weather-icon">🌤️</span>
      <span class="weather-text">${city}: <strong>${temp}</strong>${isFallback}</span>
    `;
  } catch (err) {
    console.warn('Weather badge fallback:', err);
    badge.innerHTML = `
      <span class="weather-icon">🌤️</span>
      <span class="weather-text">Weather: <strong>28.5°C</strong></span>
    `;
  }
}

// Support Assistant Interface
function initAssistant() {
  const toggleBtn = document.getElementById('chat-toggle-btn');
  const closeBtn = document.getElementById('chat-close-btn');
  const drawer = document.getElementById('chat-drawer');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');
  const quickChips = document.querySelectorAll('.chip-btn');

  if (!drawer) return;

  const sessionId = 'session-' + Math.random().toString(36).substring(2, 9);

  // Global helper to open drawer and query
  window.openAssistant = function (query) {
    drawer.classList.remove('hidden');
    if (query && input) {
      input.value = query;
      handleSendMessage(query);
      input.value = '';
    } else if (input) {
      input.focus();
    }
  };

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      drawer.classList.toggle('hidden');
      if (!drawer.classList.contains('hidden') && input) {
        input.focus();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      drawer.classList.add('hidden');
    });
  }

  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (q) {
        window.openAssistant(q);
      }
    });
  });

  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = input.value.trim();
      if (!message) return;
      input.value = '';
      handleSendMessage(message);
    });
  }

  async function handleSendMessage(text) {
    appendMessage(text, 'user');

    // Loading indicator
    const loadingId = appendLoadingBubble();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId })
      });

      removeLoadingBubble(loadingId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        appendMessage(errData.reply || `Error ${res.status}: Failed to get answer.`, 'assistant');
        return;
      }

      const data = await res.json();
      appendMessage(data.reply, 'assistant', data.logId, data.type, data.ticketId);
    } catch (err) {
      removeLoadingBubble(loadingId);
      appendMessage('Could not reach the assistant server. Please verify network connectivity.', 'assistant');
    }
  }

  function appendMessage(text, sender, logId, type, ticketId) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg msg-${sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;
    msgDiv.appendChild(bubble);

    // If assistant message, append feedback buttons
    if (sender === 'assistant' && logId) {
      const feedbackRow = document.createElement('div');
      feedbackRow.className = 'msg-feedback';
      feedbackRow.innerHTML = `
        <span>Helpful?</span>
        <button class="feedback-btn" data-rating="up" title="Helpful">👍</button>
        <button class="feedback-btn" data-rating="down" title="Not helpful">👎</button>
      `;

      feedbackRow.querySelectorAll('.feedback-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const rating = btn.getAttribute('data-rating');
          btn.classList.add('rated');
          feedbackRow.querySelectorAll('.feedback-btn').forEach(b => b.disabled = true);

          try {
            await fetch('/api/feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ logId, rating })
            });
            feedbackRow.innerHTML = `<span>Thanks for your feedback!</span>`;
          } catch (e) {
            console.error('Feedback submission failed:', e);
          }
        });
      });

      msgDiv.appendChild(feedbackRow);
    }

    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function appendLoadingBubble() {
    const id = 'loading-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg msg-assistant';
    msgDiv.id = id;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = '<span class="typing-indicator">Thinking...</span>';
    msgDiv.appendChild(bubble);

    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
    return id;
  }

  function removeLoadingBubble(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
}

// Contact form with validation & ticket feedback
function initContactForm() {
  const form = document.getElementById('contact-form');
  const alertBox = document.getElementById('contact-alert');
  const submitBtn = document.getElementById('contact-submit-btn');

  if (!form || !alertBox) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.className = 'alert hidden';
    alertBox.textContent = '';

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Ticket...';
    }

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });

      const data = await res.json();

      if (!res.ok) {
        alertBox.className = 'alert alert-danger';
        alertBox.innerHTML = `<strong>Error ${data.code || res.status}:</strong> ${data.message || 'Submission failed.'}`;
        return;
      }

      alertBox.className = 'alert alert-success';
      alertBox.innerHTML = `
        <strong>Ticket Created Successfully!</strong><br>
        Your ticket reference number is: <strong>${data.ticket.ticket_number}</strong>.<br>
        We have recorded your inquiry in our database.
      `;
      form.reset();
    } catch (err) {
      alertBox.className = 'alert alert-danger';
      alertBox.textContent = 'Network error while submitting ticket. Please check connection and try again.';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Support Ticket';
      }
    }
  });
}

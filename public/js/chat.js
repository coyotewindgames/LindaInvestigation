window.addEventListener('DOMContentLoaded', function() {
    const chatHistory = [];
    const chatHistoryDiv = document.getElementById('chat-history');
    const questionForm = document.getElementById('question-form');
    const userInput = document.getElementById('userInput');
    const trustValue = document.getElementById('trust-value');
    const fearValue = document.getElementById('fear-value');

    if (!questionForm) {
      console.error('No form with id="question-form" found!');
    }
    if (!userInput) {
      console.error('No input with id="userInput" found!');
    }

    function renderChat() {
        chatHistoryDiv.innerHTML = '';
        chatHistory.forEach(item => {
            if (item.question) {
                chatHistoryDiv.innerHTML += `<div><strong>You:</strong> ${item.question}</div>`;
            }
            if(item.response) {
                // Use pre to preserve formatting of the response
                chatHistoryDiv.innerHTML += `<div><strong>Linda:</strong> <pre>${item.response}</pre></div>`;
            }
        });
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    }

    function updateStatus(trust, fear) {
        if(trustValue) trustValue.textContent = trust;
        if(fearValue) fearValue.textContent = fear;
    }

    // Handle follow-up questions
    if (questionForm) {
      questionForm.addEventListener('submit', async function(e) {
          console.log('Form submit event attached and fired');
          e.preventDefault();
          const question = userInput.value;
          if (!question.trim()) return;

          // Add user's question to chat
          const userMessageDiv = document.createElement('div');
          userMessageDiv.innerHTML = `<strong>You:</strong> ${question}`;
          chatHistoryDiv.appendChild(userMessageDiv);

          // Add loading indicator for Linda's response
          const lindaResponseDiv = document.createElement('div');
          lindaResponseDiv.innerHTML = `<strong>Linda:</strong> <span class="loading">...</span>`;
          chatHistoryDiv.appendChild(lindaResponseDiv);
          chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;

          userInput.value = '';

          try {
              console.log('Sending question to API:', question);
              const res = await fetch('/api/interrogate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ question })
              });

              if (!res.ok) {
                const text = await res.text();
                console.error('API returned non-OK:', res.status, text);
                lindaResponseDiv.innerHTML = `<strong>Linda:</strong> <span class="error">Error: ${text}</span>`;
                return;
              }

              const reader = res.body.getReader();
              const decoder = new TextDecoder();
              let lindaResponse = '';
              lindaResponseDiv.innerHTML = `<strong>Linda:</strong> <pre></pre>`;
              const preElement = lindaResponseDiv.querySelector('pre');

              while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const chunk = decoder.decode(value, { stream: true });
                  lindaResponse += chunk;
                  preElement.textContent = lindaResponse;
                  chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
              }

          } catch (err) {
              console.error('Error in API call:', err);
              lindaResponseDiv.innerHTML = `<strong>Linda:</strong> <span class="error">Error loading AI response.</span>`;
          }
      });
    }
});

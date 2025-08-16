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
          chatHistory.push({ question });
          renderChat();
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
                chatHistory.push({ response: `Error: ${text}` });
                renderChat();
                return;
            }
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const text = await res.text();
                console.error('API returned non-JSON:', contentType, text);
                chatHistory.push({ response: `Error: Received non-JSON response.` });
                renderChat();
                return;
            }
              const data = await res.json();
              console.log('API response:', data);
              if (data.response) {
                chatHistory.push({ response: data.response });
                renderChat();
              }
              if (data.trust && data.fear) {
                updateStatus(data.trust, data.fear);
              }
          } catch (err) {
              console.error('Error in API call:', err);
              chatHistory.push({ response: 'Error loading AI response.' });
              renderChat();
          }
          userInput.value = '';
      });
    }
});

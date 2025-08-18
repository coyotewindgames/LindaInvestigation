window.addEventListener('DOMContentLoaded', function () {
  const chatHistoryDiv = document.getElementById('chat-history')
  const questionForm = document.getElementById('question-form')
  const userInput = document.getElementById('userInput')
  const trustValue = document.getElementById('trust-value')
  const fearValue = document.getElementById('fear-value')

  if (!questionForm) {
    console.error('No form with id="question-form" found!')
    return
  }
  if (!userInput) {
    console.error('No input with id="userInput" found!')
    return
  }

  function updateStatus(trust, fear) {
    if (trustValue) trustValue.textContent = trust ?? 40
    if (fearValue) fearValue.textContent = fear ?? 45
  }

  function appendMessage(role, content, isLoading = false) {
    const messageDiv = document.createElement('div')
    let html = `<strong>${role}:</strong> `
    if (isLoading) {
      html += `<pre class="loading">...</pre>`
    } else {
      html += `<pre>${content}</pre>`
    }
    messageDiv.innerHTML = html
    chatHistoryDiv.appendChild(messageDiv)
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight
    return messageDiv
  }

  if (questionForm) {
    questionForm.addEventListener('submit', async function (e) {
      e.preventDefault()
      const question = userInput.value
      if (!question.trim()) return

      appendMessage('You', question)
      const lindaResponseElement = appendMessage('Linda', '', true)
      const preElement = lindaResponseElement.querySelector('pre')

      userInput.value = ''

      try {
        const res = await fetch('/api/interrogate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        })

        if (!res.ok) {
          const text = await res.text()
          preElement.textContent = `Error: ${text}`
          preElement.classList.remove('loading')
          preElement.classList.add('error')
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullResponse += decoder.decode(value, { stream: true })
        }

        preElement.classList.remove('loading')

        try {
          const data = JSON.parse(fullResponse)
          preElement.textContent = data.response
          updateStatus(data.trust, data.fear)
        } catch (err) {
          console.error('Failed to parse streaming response:', err)
          preElement.textContent = fullResponse // Fallback for non-JSON
        }
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight
      } catch (err) {
        console.error('Error in API call:', err)
        preElement.textContent = 'Error loading AI response.'
        preElement.classList.remove('loading')
        preElement.classList.add('error')
      }
    })
  }
})

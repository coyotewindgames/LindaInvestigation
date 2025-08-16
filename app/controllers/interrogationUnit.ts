import type { HttpContext } from '@adonisjs/core/http'
import { Ollama } from 'ollama'

// singleton Ollama client
const ollamaClient = new Ollama({ host: 'http://127.0.0.1:11434'  })

async function getLindaResponse(question?: string, sessionData?: { history?: any[]; trust?: number; fear?: number }) {
  const history = sessionData?.history ?? []
  const messages = [...history]
  if (question) messages.push({ role: 'Detective', content: `Detective: ${question}` })

  try {
    const resp = await ollamaClient.chat({
      model: 'linda:latest',
      messages,
      think: false,
    })

    const rawText =  resp?.message?.content ?? ''
    try {
      const jsonText = rawText.replace(/<think>[\s\S]*?<\/think>/, '').trim()
      const parsed = JSON.parse(jsonText)
      if (typeof parsed.response === 'string' && typeof parsed.trust === 'number' && typeof parsed.fear === 'number') {
        return { ok: true, raw: rawText, response: parsed.response, trust: parsed.trust, fear: parsed.fear, messages: messages.concat([{ role: 'assistant', content: rawText }]) }
      }
      console.error('AI returned JSON but with unexpected shape', parsed)
      return { ok: false, raw: rawText, response: rawText, trust: sessionData?.trust ?? 40, fear: sessionData?.fear ?? 45, messages: messages.concat([{ role: 'assistant', content: rawText }]) }
    } catch (parseErr) {
      console.error('Failed to parse AI output as JSON. Raw output:', rawText)
      return { ok: false, raw: rawText, response: rawText, trust: sessionData?.trust ?? 40, fear: sessionData?.fear ?? 45, messages: messages.concat([{ role: 'assistant', content: rawText }]) }
    }
  } catch (err) {
    console.error('AI error', err)
    return { ok: false, raw: 'Error generating AI response.', response: 'Error generating AI response.', trust: sessionData?.trust ?? 40, fear: sessionData?.fear ?? 45, messages: messages }
  }
}

export default class InterrogationUnit {
  async show({ view, session }: HttpContext) {
    const history = (await session.get('ai_history')) ?? []
    const processedHistory = history.map((message: any) => {
      if (message.role === 'assistant') {
        try {
          // Clean and parse the content
          const jsonText = message.content.replace(/<think>[\s\S]*?<\/think>/, '').trim()
          const content = JSON.parse(jsonText)
          return { ...message, content: content.response }
        } catch (e) {
          // If parsing fails, use the raw content as a fallback
          return { ...message, content: message.content }
        }
      }
      return message
    })
    return view.render('Interrogation', { history: processedHistory })
  }

  async api({ request, response, session }: HttpContext) {
    const question = request.input('question')
    console.log('InterrogationUnit.api called with question:', question)

  const history = (await session.get('ai_history')) ?? []
  const trust = (await session.get('trust')) ?? 40
  const fear = (await session.get('fear')) ?? 45

  const sessionData = { history, trust, fear }
    const result = await getLindaResponse(question, sessionData)

    // Persist updated conversation state and stats if available
    if (result?.messages) {
      await session.put('ai_history', result.messages)
    }
    if (typeof result?.trust === 'number') {
      await session.put('trust', result.trust)
    }
    if (typeof result?.fear === 'number') {
      await session.put('fear', result.fear)
    }

    return response.json(result)
  }
}

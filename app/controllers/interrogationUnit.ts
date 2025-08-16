import type { HttpContext } from '@adonisjs/core/http'
import { Ollama } from 'ollama'
import { PassThrough } from 'stream'

// singleton Ollama client
const ollamaClient = new Ollama({ host: 'http://127.0.0.1:11434' })

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

    const messages = [...history]
    if (question) {
      messages.push({ role: 'Detective', content: `Detective: ${question}` })
    }

    response.header('Content-Type', 'text/plain')

    const passthrough = new PassThrough()
    response.stream(passthrough)

    const runStreaming = async () => {
      let fullResponse = ''
      try {
        const stream = await ollamaClient.chat({
          model: 'linda:latest',
          messages,
          stream: true,
          think: false,
        })

        for await (const part of stream) {
          const chunk = part.message.content
          if (chunk) {
            passthrough.write(chunk)
            fullResponse += chunk
          }
        }
      } catch (error) {
        console.error('Streaming error:', error)
        passthrough.write('An error occurred while generating the response.')
      } finally {
        passthrough.end()
      }

      // Now that the stream is complete, process the full response
      const newHistory = messages.concat([{ role: 'assistant', content: fullResponse }])
      await session.put('ai_history', newHistory)

      try {
        const jsonText = fullResponse.replace(/<think>[\s\S]*?<\/think>/, '').trim()
        if (jsonText) {
          const parsed = JSON.parse(jsonText)
          if (typeof parsed.trust === 'number') {
            await session.put('trust', parsed.trust)
          }
          if (typeof parsed.fear === 'number') {
            await session.put('fear', parsed.fear)
          }
        }
      } catch (e) {
        console.error('Could not parse trust/fear from AI response', e)
      }
    }

    runStreaming()
  }
}

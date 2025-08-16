import type { HttpContext } from '@adonisjs/core/http'

export default class HelloController {
  async show({ response }: HttpContext) {
  response.send('Hello World from HTMX!')
  }
}

import { XMLParser } from 'fast-xml-parser'
import { gradeFetch } from '../../_gradeFetch.js'
import { sendError, requireMethod, passThroughJson } from '../../_http.js'
import { validateToken } from '../../_studentApi.js'

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return

  const token = req.headers['x-auth-token'] || req.query.token
  const tokenErr = validateToken(token)
  if (tokenErr) return sendError(res, 400, tokenErr)

  // The v0 feed is keyed by the numeric record book id (the `recordbook`
  // parameter of the link the site copies for "подписаться на ленту").
  // Without it the upstream answers 200 with an empty RSS channel.
  const recordbook = req.query.recordbook || req.query.recordbookID
  if (!/^\d{4,12}$/.test(String(recordbook || ''))) {
    return sendError(
      res,
      400,
      'recordbook is required',
      'Нужен числовой recordbook из ссылки на ленту истории событий'
    )
  }

  const semester = req.query.semester || req.query.semesterID || req.query.SemesterID

  const qs = new URLSearchParams()
  qs.set('token', String(token))
  qs.set('recordbook', String(recordbook))
  if (semester) qs.set('semester', String(semester))

  try {
    const { res: upstream, text } = await gradeFetch(`/../v0/events?${qs.toString()}`, {
      method: 'GET',
      headers: { accept: 'application/rss+xml, application/xml, text/xml' }
    })

    if (!upstream.ok) {
      return sendError(res, upstream.status, 'Upstream returned an error', `HTTP ${upstream.status}: ${text.slice(0, 200)}`)
    }

    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        isArray: (name) => name === 'item'
      })
      const json = parser.parse(text)
      return res.status(200).json(json)
    } catch (parseErr) {
      return passThroughJson(res, upstream, text)
    }
  } catch (err) {
    return sendError(res, 502, 'Upstream request failed', err.message)
  }
}

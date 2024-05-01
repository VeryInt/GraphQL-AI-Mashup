import _ from 'lodash'
import { sleep } from '../../utils/tools'

export interface ISearchText {
    keywords: string
    region?: string
    safesearch?: 'moderate' | 'off' | 'on'
    timelimit?: string | null
}

// Simulating the unescape function
function unescape(text: string) {
    // Replace &quot; with "
    return text.replace(/&quot;/g, '"')
}

// Simulating the re.sub function
function sub(pattern: RegExp, replacement: string, text: string) {
    return text.replace(pattern, replacement)
}

// Simulating the unquote function
function unquote(url: string) {
    return url // Simulating unquoting
}

const REGEX_STRIP_TAGS = /<[^>]*>/g

// Simulating the main class
class SearchApi {
    logger: Console
    constructor() {
        // Simulating the logger
        this.logger = console
    }

    async *text({ keywords, region = 'wt-wt', safesearch = 'moderate', timelimit = null }: ISearchText) {
        if (!keywords) {
            throw new Error('Keywords are mandatory')
        }

        const vqd = await this._getVqd(keywords)
        if (!vqd) {
            throw new Error('Error in getting vqd')
        }

        const payload = {
            q: keywords,
            kl: region,
            l: region,
            s: '0',
            df: timelimit,
            vqd: vqd,
            o: 'json',
            sp: '0',
            ex: '-2',
            p: '0',
        }

        safesearch = safesearch.toLowerCase() as typeof safesearch
        if (safesearch === 'moderate') {
            payload.ex = '-1'
        } else if (safesearch === 'off') {
            payload.ex = '-2'
        } else if (safesearch === 'on') {
            payload.p = '1'
        }

        const cache = new Set()
        const searchPositions = ['0', '20', '70', '120']

        for (const s of searchPositions) {
            payload.s = s
            const resp = await this._getUrl('GET', 'https://links.duckduckgo.com/d.js', payload)

            if (!resp) {
                break
            }

            try {
                const result = await resp.json()
                const pageData = result.results
                if (!pageData) {
                    break
                }

                let resultExists = false
                for (const row of pageData) {
                    const href = row.u
                    if (href && !cache.has(href) && href !== `http://www.google.com/search?q=${keywords}`) {
                        cache.add(href)
                        const body = this._normalize(row.a)
                        if (body) {
                            resultExists = true
                            yield {
                                title: this._normalize(row.t),
                                href: this._normalizeUrl(href),
                                body: body,
                            }
                        }
                    }
                }

                if (!resultExists) {
                    break
                }
            } catch (error) {
                break
            }
        }
    }

    async _getUrl(method: 'POST' | 'GET', url: string, params: Record<string, any>) {
        for (let i = 0; i < 3; i++) {
            try {
                let resp: Response
                if (method == 'POST') {
                    resp = await fetch(url, {
                        method: method,
                        body: JSON.stringify(params),
                    })
                } else {
                    url = url + '?' + new URLSearchParams(params).toString()
                    resp = await fetch(url, {
                        method: method,
                    })
                }
                if (resp.status === 200) {
                    return resp
                }
            } catch (ex) {
                this.logger.warn(`_getUrl() ${url}`, ex)
                throw ex
            }
            await sleep(0.5)
        }
        return null
    }

    async _getVqd(keywords: string) {
        try {
            const resp = await this._getUrl('GET', 'https://duckduckgo.com', {
                q: keywords,
            })
            if (resp) {
                for (const [c1, c2] of [
                    ['vqd="', '"'],
                    ['vqd=', '&'],
                    ["vqd='", "'"],
                ]) {
                    try {
                        const result = await resp.text()
                        const start = result.indexOf(c1) + c1.length
                        const end = result.indexOf(c2, start)
                        return result.substring(start, end)
                    } catch (error) {
                        this.logger.warn(`_getVqd() keywords=${keywords} vqd not found`)
                    }
                }
            }
        } catch (error) {
            console.error('eyyy', error)
            // Handle error
        }
        return null
    }

    _normalize(rawHtml: string) {
        if (rawHtml) {
            return unescape(sub(REGEX_STRIP_TAGS, '', rawHtml))
        }
        return ''
    }

    _normalizeUrl(url: string) {
        if (url) {
            return unquote(url).replace(' ', '+')
        }
        return ''
    }
}

export default SearchApi

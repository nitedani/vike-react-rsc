export { getHeadSettings }
export type { HeadSettings }

import type { PageContext } from 'vike/types'
import type { applyHeadSettings } from './applyHeadSettings.js'
import { getHeadSetting } from './getHeadSetting.js'

// The title, lang and description the browser applies when it shows a page, computed on the server too for an action's answer
type HeadSettings = Parameters<typeof applyHeadSettings>

function getHeadSettings(pageContext: PageContext): HeadSettings {
  return [
    getHeadSetting<string | null>('title', pageContext),
    getHeadSetting<string | null>('lang', pageContext),
    getHeadSetting<string | null>('description', pageContext),
  ]
}

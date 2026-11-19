export { getHeadSettings }
export type { HeadSettings }

import type { PageContext } from 'vike/types'
import type { configsClientSide } from '../hooks/useConfig/configsClientSide.js'
import { getHeadSetting } from './getHeadSetting.js'

// The title, lang and description the browser applies when it shows a page, computed on the server too for an action's answer
type HeadSettings = { [name in (typeof configsClientSide)[number]]: string | null | undefined }

function getHeadSettings(pageContext: PageContext): HeadSettings {
  return {
    title: getHeadSetting<string | null>('title', pageContext),
    lang: getHeadSetting<string | null>('lang', pageContext),
    description: getHeadSetting<string | null>('description', pageContext),
  }
}

export { setPageContextConfigViaHook }

import type { PageContext } from 'vike/types'
import type { PageContextInternal } from '../../types/PageContext.js'
import type { ConfigViaHook } from '../../types/Config.js'
import { objectKeys } from '../../utils/objectKeys.js'
import { includes } from '../../utils/includes.js'
import { configsCumulative } from './configsCumulative.js'
import { configsClientSide } from './configsClientSide.js'

// In its own file, unlike vike-react's: a server component's useConfig() calls it too, and can't import react-streaming
function setPageContextConfigViaHook(config: ConfigViaHook, pageContext: PageContext & PageContextInternal): void {
  pageContext._configViaHook ??= {}
  objectKeys(config).forEach((configName) => {
    // Skip HTML only configs which the client-side doesn't need, saving KBs sent to the client as well as avoiding serialization errors.
    if (pageContext.isClientSideNavigation && !includes(configsClientSide, configName)) return

    if (!includes(configsCumulative, configName)) {
      // Overridable config
      const configValue = config[configName]
      if (configValue === undefined) return
      pageContext._configViaHook![configName] = configValue as any
    } else {
      // Cumulative config
      const configValue = config[configName]
      if (!configValue) return
      pageContext._configViaHook![configName] ??= []
      pageContext._configViaHook![configName].push(configValue as any)
    }
  })
}

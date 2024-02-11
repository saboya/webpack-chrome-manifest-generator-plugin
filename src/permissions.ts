import type {
  CallExpression,
  Literal,
} from 'estree'
import { type Compiler, type javascript } from 'webpack'

// https://developer.chrome.com/docs/extensions/reference/permissions-list

const otherPermissions = [
  'activeTab',
  'clipboardRead',
  'clipboardWrite',
  'geolocation',
] as const

const simplePermissions = [
  'accessibilityFeatures',
  'alarms',
  'audio',
  'bookmarks',
  'browser',
  'browsingData',
  'certificateProvider',
  'clipboard',
  'contentSettings',
  'contextMenus',
  'cookies',
  'debugger',
  'declarativeContent',
  'declarativeNetRequest',
  'declarativeNetRequestWithHostAccess',
  'declarativeNetRequestFeedback',
  'desktopCapture',
  'dns',
  'documentScan',
  'downloads',
  'downloads.open',
  'downloads.ui',
  'enterprise.deviceAttributes',
  'enterprise.hardwarePlatform',
  'enterprise.networkingAttributes',
  'enterprise.platformKeys',
  'favicon', // https://developer.chrome.com/docs/extensions/how-to/ui/favicons
  'fileBrowserHandler',
  'fileSystemProvider',
  'fontSettings',
  'gcm', // also chrome.instanceID
  'identity',
  'identity.email',
  'idle',
  'loginState',
  'management',
  'nativeMessaging', // runtime
  'notifications',
  'offscreen',
  'pageCapture',
  'platformKeys',
  'power',
  'printerProvider',
  'printing',
  'printingMetrics',
  'privacy',
  'processes',
  'proxy',
  'readingList',
  'runtime', // native messaging stuff
  'scripting',
  'search',
  'sessions',
  'sidePanel',
  'storage',
  'system.cpu',
  'system.display',
  'system.memory',
  'system.storage',
  'tabCapture',
  'tabGroups',
  'tabs',
  'topSites',
  'tts',
  'ttsEngine',
  'unlimitedStorage',
  'usb',
  'vpnProvider',
  'wallpaper',
  'webAuthenticationProxy',
  'webNavigation',
  'webRequest',
  'webRequestBlocking',
  'webview',
] as const

type UnpackArray<T> = T extends Array<(infer U)> ? U : never

export type Permissions = (typeof simplePermissions[number]) | (typeof otherPermissions[number])

function isLiteral(arg: UnpackArray<CallExpression['arguments']>): arg is Literal {
  return arg.type === 'Literal'
}

export function isPermission(name: string): name is Permissions {
  return (simplePermissions as unknown as string[]).includes(name)
}

export const buildPermissions = async (compiler: Compiler): Promise<Permissions[]> => {
  const permissions = new Set<Permissions>()

  return new Promise<Permissions[]>((resolve) => {
    compiler.hooks.normalModuleFactory.tap('ChromeManifestGenerator', factory => {
      const handler = (parser: javascript.JavascriptParser): void => {
        parser.hooks.call.for('document.execCommand').tap('ChromeManifestGenerator', (expression) => {
          if (expression.arguments.length <= 0) {
            return
          }

          if (!isLiteral(expression.arguments[0])) {
            return
          }

          switch (expression.arguments[0].value) {
            case 'paste': {
              permissions.add('clipboardRead')
              break
            }
            case 'copy':
            case 'cut': {
              permissions.add('clipboardWrite')
              break
            }
            default: {
              break
            }
          }
        })

        parser.hooks.callMemberChain.for('chrome').tap('ChromeManifestGenerator', (callExpression, chain) => {
          if (chain.length > 0 && chain[0] === 'storage') {
            permissions.add('storage')
          }
        })

        parser.hooks.callMemberChain.for('navigator').tap('ChromeManifestGenerator', (callExpression, chain) => {
          if (chain.length > 0 && chain[0] === 'geolocation') {
            permissions.add('geolocation')
          }
        })

        parser.hooks.finish.tap('ChromeManifestGenerator', () => {
          resolve(Array.from(permissions))
        })
      }

      factory.hooks.parser.for('javascript/auto').tap('ChromeManifestGenerator', handler)
    })
  })
}

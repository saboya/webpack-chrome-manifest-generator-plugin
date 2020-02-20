import { Compiler } from 'webpack'

export type Permissions = 'alarms'
| 'audio'
| 'browser'
| 'certificateProvider'
| 'clipboard'
| 'clipboardRead'
| 'clipboardWrite'
| 'contextMenus'
| 'desktopCapture'
| 'displaySource'
| 'documentScan'
| 'experimental'
| 'fileBrowserHandler'
| 'fileSystem'
| 'fileSystemProvider'
| 'geolocation'
| 'gcm'
| 'hid'
| 'identity'
| 'idle'
| 'mdns'
| 'mediaGalleries'
| 'notifications'
| 'platformKeys'
| 'power'
| 'printerProvider'
| 'proxy'
| 'serial'
| 'signedInDevices'
| 'socket'
| 'storage'
| 'syncFileSystem'
| 'tts'
| 'usb'
| 'virtualKeyboard'
| 'vpnProvider'
| 'wallpaper'
| 'webview'

const simplePermissions: Permissions[] = [
  'alarms',
  'audio',
  'browser',
  'certificateProvider',
  'clipboard',
  'contextMenus',
  'desktopCapture',
  'displaySource',
  'documentScan',
  'experimental',
  'fileBrowserHandler',
  'fileSystem',
  'fileSystemProvider',
  'gcm',
  'hid',
  'identity',
  'idle',
  'mdns',
  'mediaGalleries',
  'notifications',
  'platformKeys',
  'power',
  'printerProvider',
  'proxy',
  'serial',
  'signedInDevices',
  'socket',
  'storage',
  'syncFileSystem',
  'tts',
  'usb',
  'virtualKeyboard',
  'vpnProvider',
  'wallpaper',
  'webview',
]

const permissions = async (compiler: Compiler): Promise<string[]> => {
  const permissions = new Set<Permissions>()

  return new Promise<string[]>((resolve) => {
    compiler.hooks.normalModuleFactory.tap('TestPlugin', factory => {
      const handler = (parser: any): void => {
        parser.hooks.call.for('document.execCommand').tap('ChromeManifestGenerator', (expression: any) => {
          if (expression.arguments.length > 0) {
            switch (expression.arguments[0].value) {
              case 'paste':
                permissions.add('clipboardRead')
                break
              case 'copy':
              case 'cut':
                permissions.add('clipboardWrite')
                break
            }
          }
        })

        parser.hooks.expressionAnyMember.for('chrome').tap('ChromeManifestGenerator', (expression: any) => {
          if (simplePermissions.includes(expression.property.name)) {
            permissions.add(expression.property.name)
          }
        })

        parser.hooks.callAnyMember.for('navigator.geolocation').tap('ChromeManifestGenerator', (_: any) => {
          permissions.add('geolocation')
        })
      }

      factory.hooks.parser.tap('javascript/auto', 'ChromeManifestGenerator', handler)
      factory.hooks.parser.tap('javascript/dynamic', 'ChromeManifestGenerator', handler)
      factory.hooks.parser.tap('javascript/esm', 'ChromeManifestGenerator', handler)
    })

    compiler.hooks.afterCompile.tap('ChromeManifestGenerator', (_) => {
      resolve(Array.from(permissions))
    })
  })
}

export default permissions

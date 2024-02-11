import { vol } from 'memfs'
import { type PermissionTest, WebpackTestHelper } from './util'

process.env.MEMFS_DONT_WARN = '1'

jest.mock('fs')

const permissionTests: PermissionTest[] = [
  {
    testTitle: 'chrome.storage.* requests for "storage" permission',
    permission: 'storage',
    code: 'chrome.storage.sync.get([\'key\'], (result) => { console.log(\'Value currently is \' + result.key); });',
  },
  {
    testTitle: 'navigator.geolocation.* requests for "geolocation" permission',
    permission: 'geolocation',
    code: 'navigator.geolocation.getCurrentPosition(geoSuccess, geoError);',
  },
  {
    testTitle: 'document.execCommand("paste") requests for "clipboardRead" permission',
    permission: 'clipboardRead',
    code: 'document.execCommand("paste");',
  },
  {
    testTitle: 'document.execCommand("cut") requests for "clipboardWrite" permission',
    permission: 'clipboardWrite',
    code: 'document.execCommand("cut");',
  },
  {
    testTitle: 'document.execCommand("copy") requests for "clipboardWrite" permission',
    permission: 'clipboardWrite',
    code: 'document.execCommand("copy");',
  },
]

const permissionTestHelper = async ({ testTitle, permission, code }: PermissionTest) => {
  test(`${testTitle}`, async () => {
    vol.fromJSON({
      '/src/index.js': `
        /*__TYPE__: "content"*/
        /*__MATCHES__: ["https://www.example.com/*"]*/
        /*__RUN_AT__: "document_idle"*/

        ${code}`,
    })

    const { manifestJSON } = await WebpackTestHelper()

    expect(manifestJSON.permissions).toContain(permission)
  })
}

beforeEach(() => {
  vol.reset()
})

describe('ChromeManifestGeneratorPlugin tests', () => {
  test('Manifest is generated correctly for a basic content script', async () => {
    const scriptUrlMatch = 'https://www.example.com/*'

    vol.fromJSON({
      '/src/index.js': `
        /*__TYPE__: "content"*/
        /*__MATCHES__: ["${scriptUrlMatch}"]*/
        /*__RUN_AT__: "document_idle"*/

        console.log('test');`,
    })

    const { manifestJSON } = await WebpackTestHelper()

    expect(manifestJSON.permissions).toContain(scriptUrlMatch)
  })

  test('Manifest is generated correctly for a basic background script', async () => {
    const scriptUrlMatch = 'https://www.example.com/*'

    vol.fromJSON({
      '/src/index.js': `
        /*__TYPE__: "background"*/
        /*__MATCHES__: ["${scriptUrlMatch}"]*/

        console.log('test');`,
    })

    const { manifestJSON } = await WebpackTestHelper()

    expect(manifestJSON.permissions).toContain('background')
  })

  test('Manifest is generated with supplied content_security_policy', async () => {
    const scriptUrlMatch = 'https://www.example.com/*'

    vol.fromJSON({
      '/src/index.js': `
        /*__TYPE__: "background"*/
        /*__MATCHES__: ["${scriptUrlMatch}"]*/

        console.log('test');`,
    })

    const csp = 'script-src \'self\' \'unsafe-eval\'; object-src \'self\''

    const { manifestJSON } = await WebpackTestHelper({ content_security_policy: csp })

    expect(manifestJSON.content_security_policy).toEqual(csp)
  })

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  permissionTests.map(permissionTestHelper)
})

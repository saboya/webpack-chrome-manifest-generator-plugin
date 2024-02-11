import { vol } from 'memfs'
import * as path from 'node:path'
import * as webpack from 'webpack'

import ChromeManifestGeneratorPlugin, { type ChromeExtensionManifest, type Options } from '../src'

jest.mock('fs')

const OUTPUT_PATH = '/dist'
const MANIFEST_FILENAME = 'manifest.json'

const config: (options: Partial<Options>) => webpack.Configuration = (options) => ({
  mode: 'development',
  target: 'web',
  stats: 'verbose',
  entry: {
    default: '/src/index.js',
  },
  plugins: [
    new ChromeManifestGeneratorPlugin({
      name: 'Test Extension',
      package: {
        name: 'TestExtension',
        description: 'This is a text extension',
        version: '1.0.0',
      },
      ...options,
    }),
  ],
  output: {
    path: OUTPUT_PATH,
    filename: '[name].js',
  },
})

export const WebpackTestHelper = async (options: Partial<Options> = {}) => {
  return new Promise<{ stats: webpack.MultiStats; manifestJSON: ChromeExtensionManifest }>((resolve, reject) => {
    webpack([config(options)], (err, stats) => {
      expect(err).toBeNull()

      if (err !== null) {
        reject(err)
        return
      }

      expect(stats).not.toBeUndefined()

      if (stats === undefined) {
        reject(err)
        return
      }

      const statsJSON = stats.toJson()
      expect(statsJSON.children).not.toBeUndefined()

      const volumeJSON = vol.toJSON(OUTPUT_PATH) as Record<string, string>

      let manifestOutput: Record<string, string> = {}
      for (let filename of Object.keys(volumeJSON)) {
        if (filename !== path.join(OUTPUT_PATH, MANIFEST_FILENAME)) {
          continue
        }

        manifestOutput[filename] = volumeJSON[filename]
      }
      expect(manifestOutput).toMatchSnapshot()

      resolve({ stats, manifestJSON: JSON.parse(manifestOutput[path.join(OUTPUT_PATH, MANIFEST_FILENAME)]) })
    })
  })
}

export interface PermissionTest {
  testTitle: string
  permission: string
  code: string
}

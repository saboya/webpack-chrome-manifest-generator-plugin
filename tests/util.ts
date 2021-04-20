import * as webpack from 'webpack'
import { vol } from 'memfs'
import * as path from 'path'

import ChromeManifestGeneratorPlugin, { ChromeExtensionManifest, Options } from '../src'

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
  return new Promise<{ stats: webpack.compilation.MultiStats, manifestJSON: ChromeExtensionManifest }>((resulve, reject) => {
    webpack([config(options)], (err: Error | null, stats) => {
      expect(err).toBeNull()

      if (err !== null) {
        reject(err)
      }

      const statsJSON = stats.toJson()
      expect(statsJSON.children).not.toBeUndefined()

      const volumeJSON = vol.toJSON(OUTPUT_PATH) as { [key: string]: string }
      const manifestOutput = Object.keys(volumeJSON)
        .filter(file => file === path.join(OUTPUT_PATH, MANIFEST_FILENAME))
        .map(filename => ({ [filename]: volumeJSON[filename] }))
        .reduce((a, c) => ({ ...a, ...c }), {})

      expect(manifestOutput).toMatchSnapshot()

      resulve({ stats, manifestJSON: JSON.parse(manifestOutput[path.join(OUTPUT_PATH, MANIFEST_FILENAME)]) })
    })
  })
}

export interface PermissionTest {
  testTitle: string,
  permission: string,
  code: string,
}

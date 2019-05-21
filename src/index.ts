import * as path from 'path'
import { Compiler, Plugin } from 'webpack'
import { RawSource } from 'webpack-sources'

import Meta, { ContentScript } from './meta'

import Permissions from './permissions'

type Permissions = any[]

interface Package {
  name: string,
  description: string,
  version: string,
}

export interface Options {
  autoDetectPermissions: boolean,
  name: string,
  permissions: ChromeExtensionManifest['permissions'],
  package: Package,
  content_security_policy?: string,
}

const defaultOptions = {
  autoDetectPermissions: true,
  name: 'My Extension',
  permissions: [],
}

export interface ChromeExtensionManifest {
  manifest_version: 2
  name: string
  short_name: string
  version: string
  content_security_policy?: string
  default_locale?: string
  description: string
  permissions: string[]
  background: {
    persistent?: boolean
    page?: string
    scripts: string[],
  }
  content_scripts: ContentScript[]
  web_accessible_resources: string[]
}

class ChromeManifestGeneratorPlugin implements Plugin {
  private options: Options
  private permissions: Promise<Permissions>
  private meta: ReturnType<typeof Meta>

  constructor (options: { package: Package } & Partial<Options>) {
    this.options = Object.assign({}, defaultOptions, options)
    this.permissions = Promise.resolve([])
  }

  apply (compiler: Compiler) {
    this.meta = Meta(compiler)

    if (this.options.autoDetectPermissions) {
      this.permissions = Permissions(compiler)
    }

    compiler.hooks.emit.tap('ChromeManifestGenerator', (compilation) => {
      if (compiler.isChild()) {
        return
      }

      Promise.all([
        this.permissions,
        this.meta,
      ]).then(([autoPermissions, meta]) => {
        const permissions = new Set(this.options.permissions.concat(autoPermissions))
        const contentScripts: ContentScript[] = []
        const backgroundScripts: string[] = []

        for (const key of Object.keys(meta)) {
          const script = meta[key]

          const chunk = compilation.chunks.find(
            chunk => chunk.entryModule.resource === key,
          )

          if (chunk === undefined || !Object.prototype.hasOwnProperty.call(meta, key)) {
            continue
          }

          switch (script.type) {
            case 'content':
              const contentScript: ContentScript = {
                js: chunk.files,
                type: script.type,
                run_at: script.run_at,
                matches: script.matches,
              }
              contentScript.matches.forEach(match => permissions.add(match))

              contentScripts.push(contentScript)
              break
            case 'background':
              backgroundScripts.push(...chunk.files)
              break
          }
        }

        const manifest: ChromeExtensionManifest = {
          'manifest_version': 2,
          'name': this.options.name,
          'short_name': this.options.package.name,
          'description': this.options.package.description,
          'version': this.options.package.version,
          'permissions': Array.from(permissions),
          'web_accessible_resources': [
            'img/*',
          ],
          'background': { scripts: [] },
          'content_scripts': [],
        }

        if (this.options.content_security_policy !== undefined) {
          manifest['content_security_policy'] = this.options.content_security_policy
        }

        if (contentScripts.length > 0) {
          manifest.content_scripts = contentScripts
        }

        if (backgroundScripts.length > 0) {
          manifest.permissions.push('background')
          manifest.background.scripts = backgroundScripts
        }

        const outputPathAndFilename = path.resolve(
          compilation.outputOptions.path,
          path.basename('manifest.json'),
        )

        const relativeOutputPath = path.relative(
         compilation.outputOptions.path,
          outputPathAndFilename,
        )

        compilation.assets[relativeOutputPath] = new RawSource(JSON.stringify(manifest, null, 2))
      }).catch(e => {
        throw e
      })
    })
  }
}

export default ChromeManifestGeneratorPlugin

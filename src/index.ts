import * as path from 'node:path'
import webpack, { type WebpackPluginInstance } from 'webpack'

import Meta, { type ContentScript } from './meta'

import { type Permissions, buildPermissions } from './permissions'

interface Package {
  name: string
  description: string
  version: string
}

export interface Options {
  autoDetectPermissions: boolean
  name: string
  permissions: ChromeExtensionManifest['permissions']
  package: Package
  content_security_policy?: string
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
    scripts: string[]
  }
  content_scripts: ContentScript[]
  web_accessible_resources: string[]
}

class ChromeManifestGeneratorPlugin implements WebpackPluginInstance {
  private readonly options: Options
  private permissions: Promise<Permissions[]>
  // @ts-expect-error this will be initialized when plugin runs
  private meta: ReturnType<typeof Meta>

  constructor(options: { package: Package } & Partial<Options>) {
    this.options = { ...defaultOptions, ...options}
    this.permissions = Promise.resolve([])
  }

  apply(compiler: webpack.Compiler): void {
    this.meta = Meta(compiler)

    if (this.options.autoDetectPermissions) {
      this.permissions = buildPermissions(compiler)
    }

    compiler.hooks.thisCompilation.tap('ChromeManifestGenerator', (compilation) => {
      if (compiler.isChild()) {
        return
      }

      compilation.hooks.processAssets.tapPromise({
        name: 'ChromeManifestGenerator',
        stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
      }, async (_assets) => {
        const [autoPermissions, meta] = await Promise.all([this.permissions,this.meta])

        const permissions = new Set(this.options.permissions.concat(autoPermissions))
        const contentScripts: ContentScript[] = []
        const backgroundScripts: string[] = []

        for (const key of Object.keys(meta)) {
          const script = meta[key]

          const chunk = Array.from(compilation.chunks).find((chunk) => {
            return compilation.chunkGraph.getChunkModules(chunk).find(module => {
              return compilation.chunkGraph.isEntryModule(module) && module.identifier() === key
            })
          })

          if (chunk === undefined || ! Object.hasOwn(meta, key)) {
            continue
          }

          switch (script.type) {
            case 'content':
              for (let match of script.matches) {
                permissions.add(match)
              }

              contentScripts.push({
                js: Array.from(chunk.files),
                type: script.type,
                run_at: script.run_at,
                matches: script.matches,
              })
              break

            case 'background':
              backgroundScripts.push(...chunk.files)
              break

          }
        }

        const manifest: ChromeExtensionManifest = {
          manifest_version: 2,
          name: this.options.name,
          short_name: this.options.package.name,
          description: this.options.package.description,
          version: this.options.package.version,
          permissions: Array.from(permissions),
          web_accessible_resources: [
            'img/*',
          ],
          background: { scripts: [] },
          content_scripts: [],
        }

        if (this.options.content_security_policy !== undefined) {
          manifest.content_security_policy = this.options.content_security_policy
        }

        if (contentScripts.length > 0) {
          manifest.content_scripts = contentScripts
        }

        if (backgroundScripts.length > 0) {
          manifest.permissions.push('background')
          manifest.background.scripts = backgroundScripts
        }

        const outputPathAndFilename = path.resolve(
          compilation.outputOptions.path ?? '',
          path.basename('manifest.json'),
        )

        const relativeOutputPath = path.relative(
          compilation.outputOptions.path ?? '',
          outputPathAndFilename,
        )

        compilation.emitAsset(relativeOutputPath, new webpack.sources.RawSource(JSON.stringify(manifest, undefined, 2)))
      })
    })
  }
}

export default ChromeManifestGeneratorPlugin

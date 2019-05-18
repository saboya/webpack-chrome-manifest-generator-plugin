import { Compiler } from 'webpack'

export interface Script<T extends string> {
  js: string[],
  type: T,
}

export interface BackgroundScript extends Script<'background'> {
  run_at: string
  matches: string[]
}

export interface ContentScript extends Script<'content'> {
  run_at: string
  matches: string[]
}

const meta = (compiler: Compiler) => {
  return new Promise<{ [key: string]: ContentScript | BackgroundScript}>((resolve, reject) => {
    compiler.hooks.normalModuleFactory.tap('TestPlugin', factory => {
      const files: { [key: string]: any } = {}

      const handler = (parser: any) => {
        parser.hooks.program.tap('ChromeManifestGenerator', (ast: any, comments: any[]) => {
          const file = parser.state.current.resource
          const regexp = /^\s*(__RUN_AT__|__MATCHES__|__TYPE__):\s*(.+)\s*$/
          const keys: { [key: string]: any } = {
            __MATCHES__: 'matches',
            __RUN_AT__: 'run_at',
            __TYPE__: 'type',
          }

          comments.filter(comment => {
            return comment.type === 'Block' && regexp.test(comment.value)
          }).map(comment => {
            if (files[file] === undefined) {
              files[file] = {}
            }

            const match = regexp.exec(comment.value)

            if (match !== null) {
              try {
                files[file][keys[match[1]]] = JSON.parse(match[2])
              } catch (err) {
                throw new Error(`[chrome-extension-plugin]: Eror parsing ${match[1]} field in ${file}.`)
              }
            }
          })

        })
      }

      factory.hooks.parser.tap('javascript/auto', 'ChromeManifestGenerator', handler)
      factory.hooks.parser.tap('javascript/dynamic', 'ChromeManifestGenerator', handler)
      factory.hooks.parser.tap('javascript/esm', 'ChromeManifestGenerator', handler)

      resolve(files)
    })
  })
}

export default meta

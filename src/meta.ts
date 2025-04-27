import type { Compiler, javascript } from 'webpack'

export interface Script<T extends string> {
  js: string[]
  type: T
}

export interface BackgroundScript extends Script<'background'> {
  run_at: string
  matches: string[]
}

export interface ContentScript extends Script<'content'> {
  run_at: string
  matches: string[]
}

interface ScriptComment {
  __RUN_AT__: string
  __MATCHES__: string
  __TYPE__: string
}

interface MetaPluginReturn { [key: string]: ContentScript | BackgroundScript }

const SCRIPT_COMMENT_REGEXP = /^\s*(__RUN_AT__|__MATCHES__|__TYPE__):\s*(.+)\s*$/

function matchScriptComment(comment: string) {
  return SCRIPT_COMMENT_REGEXP.exec(comment) as (RegExpExecArray & [string, keyof ScriptComment, string]) | null
}

const meta = async (compiler: Compiler): Promise<MetaPluginReturn> => {
  return new Promise<MetaPluginReturn>((resolve) => {
    compiler.hooks.normalModuleFactory.tap('ChromeManifestGenerator', factory => {
      const files: Record<string, any> = {}

      const handler = (parser: javascript.JavascriptParser): void => {
        parser.hooks.program.tap('ChromeManifestGenerator', (_, comments) => {
          const moduleIdentifier = parser.state.current.identifier()
          const regexp = /^\s*(__RUN_AT__|__MATCHES__|__TYPE__):\s*(.+)\s*$/
          const keys: ScriptComment = {
            __MATCHES__: 'matches',
            __RUN_AT__: 'run_at',
            __TYPE__: 'type',
          }

          for (
            let comment of comments.filter(c => {
              return c.type === 'Block' && regexp.test(c.value)
            })
          ) {
            if (files[moduleIdentifier] === undefined) {
              files[moduleIdentifier] = {}
            }

            const match = matchScriptComment(comment.value)

            if (match === null) {
              return
            }

            try {
              files[moduleIdentifier][keys[match[1]]] = JSON.parse(match[2])
            } catch {
              throw new Error(`[chrome-extension-plugin]: Error parsing ${match[1]} field in ${parser.state.current.resource}.`)
            }
          }
        })
      }

      factory.hooks.parser.for('javascript/auto').tap('ChromeManifestGenerator', handler)

      resolve(files)
    })
  })
}

export default meta

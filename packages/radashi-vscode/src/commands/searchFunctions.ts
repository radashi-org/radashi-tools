import type { SearchIndex } from 'algoliasearch'
import glob from 'fast-glob'
import * as jsonc from 'jsonc-parser'
import fs from 'node:fs'
import path from 'node:path'
import { inspect } from 'node:util'
import { dash, debounce, sift, snake, tryit } from 'radashi'
import * as vscode from 'vscode'
import yaml from 'yaml'
import { dedent } from '../util/dedent.js'
import type { RadashiFolder } from '../util/getRadashiFolder.js'
import { memoAsync } from '../util/memoAsync.js'
import { outputChannel } from '../util/outputChannel.js'
import { formatRelativeElapsedTime } from '../util/time.js'
import algoliasearch = require('algoliasearch')
import fuzzy = require('@nozbe/microfuzz')

interface FunctionInfo {
  ref: string
  group: string
  name: string
  description: string
  pr_number?: number
  committed_by: string | null
  committed_at: Date | null
  /**
   * Exists for local functions only.
   */
  docs_path?: string
}

export async function searchFunctions(
  radashiFolder: RadashiFolder | undefined,
) {
  const algolia = algoliasearch.default(
    '7YYOXVJ9K7',
    '7d9a76e671047bd60cf02883dc773861',
  )

  type QuickPickItem = vscode.QuickPickItem & { fn: FunctionInfo }

  const quickPick = vscode.window.createQuickPick<QuickPickItem>()
  quickPick.placeholder = 'Search for functions...'
  quickPick.items = []

  async function loadLocalFunctions() {
    if (!radashiFolder) {
      return []
    }

    const files = await glob(
      [
        'src/**/*.ts',
        'overrides/src/**/*.ts',
        '!src/*.ts',
        '!overrides/src/*.ts',
      ],
      {
        cwd: radashiFolder.path,
      },
    )

    return files.map((file): QuickPickItem => {
      const funcPath = file
        .replace(/\.ts$/, '')
        .split(path.sep)
        .filter((part, i) => {
          if (i === 0 || (i === 1 && part === 'src')) {
            return false
          }
          return true
        })
        .join('/')

      const docsFile = file
        .replace(/\.ts$/, '.mdx')
        .replace(/(^|\/)src\//, '$1docs/')

      const docsFilePath = path.join(radashiFolder.path, docsFile)
      const docs = fs.readFileSync(docsFilePath, 'utf8')

      const metadata: {
        title?: string
        description?: string
      } = yaml.parse(docs.match(/---([\s\S]*?)---/)?.[1] ?? '')

      const [group, name] = funcPath.split('/')

      return {
        fn: {
          ref: '',
          group,
          name,
          description: '',
          committed_at: null,
          committed_by: null,
          docs_path: docsFilePath,
        },
        label: metadata.title ?? name,
        description: metadata.description ?? '',
        alwaysShow: true,
      }
    })
  }

  const localFunctionsPromise = loadLocalFunctions().catch(error => {
    outputChannel.appendLine(
      `🚫 Failed to load local functions: ${error.stack}`,
    )
    return []
  })

  const algoliaSearch = memoAsync(
    (query: string) =>
      algolia.multipleQueries<FunctionInfo>([
        {
          indexName: 'merged_functions',
          query,
          params: {
            hitsPerPage: 5,
            attributesToRetrieve: [
              'ref',
              'group',
              'name',
              'description',
              'committed_by',
              'committed_at',
            ],
          },
        },
        {
          indexName: 'proposed_functions',
          query,
          params: {
            hitsPerPage: 5,
            attributesToRetrieve: [
              'ref',
              'group',
              'name',
              'description',
              'pr_number',
              'committed_by',
              'committed_at',
            ],
          },
        },
      ]),
    {
      // Cache for 10 minutes
      ttl: 10 * 60 * 1000,
    },
  )

  const onInput = debounce({ delay: 400 }, async query => {
    if (query.length > 0) {
      const renderQuickPickItem = (fn: FunctionInfo): QuickPickItem => {
        const elapsed = fn.committed_at
          ? Date.now() - new Date(fn.committed_at).getTime()
          : null

        let detail =
          fn.pr_number != null
            ? `PR #${fn.pr_number}`
            : fn.ref
              ? `🏛️ Released`
              : `🥨 Workspace`

        if (elapsed) {
          detail += ` (${formatRelativeElapsedTime(elapsed)})`
        }

        return {
          fn,
          label: fn.name,
          description: fn.description,
          detail,
          alwaysShow: true,
        }
      }

      outputChannel.appendLine(`Searching for "${query}"...`)
      const [error, response] = await tryit(algoliaSearch)(query)
      const results = response
        ? sift(
            response.results.flatMap((result): QuickPickItem[] => {
              if ('hits' in result) {
                return result.hits.map(renderQuickPickItem)
              }
              outputChannel.appendLine(
                `❌ No "hits" property in Algolia result: ${inspect(result, {
                  depth: 10,
                })}`,
              )
              return []
            }),
          )
        : []

      if (error) {
        outputChannel.appendLine(
          `🚫 Failed to search for "${query}": ${error.stack}`,
        )
      } else {
        outputChannel.appendLine(inspect(response.results, { depth: 10 }))
      }

      const localFuncs = await localFunctionsPromise

      quickPick.items = fuzzy
        .default([...localFuncs, ...results], {
          getText: (item: QuickPickItem) => [
            item.label,
            item.description ?? null,
          ],
        })(query)
        .map(result => result.item)

      outputChannel.appendLine(`✔️ Found ${quickPick.items.length} results`)
    } else {
      quickPick.items = []
    }
  })

  quickPick.onDidChangeValue(onInput)

  async function showFunctionOptions(selected: QuickPickItem) {
    enum Opt {
      ViewDocumentation = 'View documentation',
      ImportIntoRadashi = 'Import into my Radashi',
      ViewFunctionSource = 'View function source',
      GoToPullRequest = 'Go to pull request on GitHub',
    }

    const options = [Opt.ViewDocumentation, Opt.ViewFunctionSource]

    if (selected.fn.pr_number != null) {
      options.push(Opt.GoToPullRequest)

      if (radashiFolder) {
        options.push(Opt.ImportIntoRadashi)
      }
    }

    const selectedOption = await vscode.window.showQuickPick(options, {
      placeHolder: `Choose an action for ${selected.fn.name}`,
    })

    switch (selectedOption) {
      case Opt.ViewDocumentation: {
        let index: SearchIndex | undefined
        let objectID: string | undefined

        if (selected.fn.ref) {
          if (selected.fn.pr_number) {
            index = algolia.initIndex('proposed_functions')
            objectID = `${selected.fn.name}#${selected.fn.pr_number}`
          } else {
            index = algolia.initIndex('merged_functions')
            objectID = selected.fn.name
          }
        }

        try {
          let documentation: string | undefined

          if (index && objectID) {
            const response = await index.getObject<{
              documentation: string | null
            }>(objectID, ['documentation'])

            if (response.documentation) {
              documentation = response.documentation
            }
          } else if (selected.fn.docs_path) {
            try {
              documentation = fs.readFileSync(selected.fn.docs_path, 'utf8')
            } catch {
              outputChannel.appendLine(
                `🚫 Failed to read documentation file: ${selected.fn.docs_path}`,
              )
            }
            if (documentation) {
              const { renderPageMarkdown } = await import('../util/markdown.js')
              try {
                const rendered = await renderPageMarkdown(documentation)
                documentation = rendered!.text
              } catch (error) {
                outputChannel.appendLine(
                  `🚫 Failed to render documentation file: ${selected.fn.docs_path}\n\n${error}`,
                )
                vscode.window.showErrorMessage(
                  `Something went wrong while rendering ${selected.fn.name}‘s markdown file. Please report this with a reproducible example: https://github.com/radashi-org/radashi-tools/issues/new`,
                )
                break
              }
            }
          }

          if (documentation) {
            await viewDocumentation(selected.fn, documentation)
          } else {
            vscode.window.showInformationMessage(
              'Documentation not found for this function.',
            )
          }
        } catch (error) {
          console.error('Error fetching documentation:', error)
          vscode.window.showErrorMessage(
            'Failed to fetch documentation. Please try again.',
          )
        }
        break
      }
      case Opt.GoToPullRequest:
        await viewPullRequest(selected.fn)
        break
      case Opt.ImportIntoRadashi:
        await importFunction(selected.fn, radashiFolder!)
        break
      case Opt.ViewFunctionSource:
        await viewFunctionSource(selected.fn)
        break
    }
  }

  quickPick.onDidAccept(async () => {
    const selectedItem = quickPick.selectedItems[0]
    if (selectedItem) {
      quickPick.hide()
      await showFunctionOptions(selectedItem)
    }
  })

  quickPick.show()
}

async function viewDocumentation(fn: FunctionInfo, documentation: string) {
  if (fn.committed_by && !fn.pr_number) {
    const isRadashiOnly =
      fn.committed_by !== 'Alec Larson' ||
      new Date(fn.committed_at!) > new Date('2024-06-24 22:02:49+00')

    let message: string

    if (isRadashiOnly) {
      message = dedent`
      <h3>Credit</h3>
      <p>This function was originally contributed by <strong>${fn.committed_by}</strong>.</p>
    `
    } else {
      message = dedent`
      <h3>Credit</h3>
      <p>This function was inherited from our predecessor, Radash.</p>
    `
    }

    documentation = documentation + message
  }

  if (!fn.pr_number) {
    let editUrl: string | undefined

    if (fn.ref) {
      const [repo, branch] = fn.ref.split('#')
      editUrl = `https://github.com/${repo}/edit/${branch}/docs/${fn.group}/${fn.name}.mdx`
    } else if (fn.docs_path) {
      editUrl = `file://${fn.docs_path}`
    }

    if (editUrl) {
      documentation += `<hr/><p><a id="edit-link" href="${editUrl}" target="_blank">Edit this documentation</a></p>`
    }
  }

  const panel = vscode.window.createWebviewPanel(
    fn.ref + ':' + fn.name,
    `${fn.name} Documentation`,
    vscode.ViewColumn.One,
    { enableScripts: true },
  )

  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'editDocumentation') {
      outputChannel.appendLine(
        `📚 Opening documentation in editor: ${message.path}`,
      )
      const uri = vscode.Uri.file(message.path)
      await vscode.window.showTextDocument(uri)
    } else if (message.command === 'themeDetected') {
      outputChannel.appendLine(`🎨 Theme detected: ${message.theme}`)

      const themeId = dash(message.theme as string)

      let themePath: string | undefined
      for (const extension of vscode.extensions.all) {
        const theme = extension.packageJSON.contributes?.themes?.find(
          (theme: any) => dash(theme.label) === themeId,
        )
        if (theme) {
          themePath = path.resolve(extension.extensionPath, theme.path)
          break
        }
      }

      if (themePath == null) {
        const defaultThemeId = themeId.startsWith('default-')
          ? snake(themeId.slice(8))
              .replace('+', '_plus')
              .replace(
                /high_contrast(_light)?/,
                (_, light) => 'hc' + (light ?? '_black'),
              )
          : themeId.startsWith('visual-studio-')
            ? snake(themeId.slice(14)) + '_vs'
            : null

        if (defaultThemeId) {
          const defaultThemePath = path.join(
            vscode.env.appRoot,
            'extensions/theme-defaults/themes',
            defaultThemeId + '.json',
          )

          if (fs.existsSync(defaultThemePath)) {
            themePath = defaultThemePath
          }
        }

        if (themePath == null) {
          vscode.window.showErrorMessage('Could not find theme')
          return
        }
      }

      let theme: any

      try {
        const themeContent = fs.readFileSync(themePath, 'utf8')
        theme = jsonc.parse(themeContent)
      } catch (error) {
        vscode.window.showErrorMessage(`Error reading theme file: ${error}`)
        return
      }

      panel.webview.postMessage({
        command: 'setTheme',
        theme: {
          name: themeId,
          settings: theme.tokenColors,
        },
      })
    }
  })

  panel.webview.html =
    documentation +
    fs.readFileSync(path.join(__dirname, 'assets/documentation.html'), 'utf8')
}

async function viewPullRequest(fn: FunctionInfo) {
  if (fn.pr_number) {
    const url = `https://github.com/radashi-org/radashi/pull/${fn.pr_number}`
    vscode.env.openExternal(vscode.Uri.parse(url))
  }
}

async function importFunction(fn: FunctionInfo, radashiFolder: RadashiFolder) {
  const helper = await radashiFolder.importHelper()
  await helper.run([
    'pr',
    'import',
    String(fn.pr_number),
    '--dir',
    radashiFolder.path,
    '--files',
    fn.name,
  ])
}

async function viewFunctionSource(fn: FunctionInfo) {
  try {
    let [repoPath, ref] = fn.ref.split('#')
    if (ref == null) {
      ref = repoPath
      repoPath = 'radashi-org/radashi'
    }

    const url = `https://github.com/${repoPath}/blob/${ref}/src/${fn.group}/${fn.name}.ts`
    await vscode.env.openExternal(vscode.Uri.parse(url))
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to open source code in browser: ${error}`,
    )
  }
}

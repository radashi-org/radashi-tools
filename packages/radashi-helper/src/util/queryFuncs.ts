import { similarity } from 'radashi'
import { EarlyExitError, RadashiError } from './error'
import { prompt } from './prompt'

export async function queryFuncs(
  query: string,
  funcPaths: string[],
  options: {
    exactMatch?: boolean
    message?: string
    confirmMessage?: string
  } = {},
) {
  let funcPath: string

  if (options.exactMatch) {
    funcPath = query
  } else {
    let bestMatches: string[]
    let confirm = false

    if (query !== '') {
      const loweredQuery = query.toLowerCase()
      const scores = funcPaths.map(funcPath => {
        const funcName = funcPath.split('/').at(-1)!
        return Math.min(
          similarity(loweredQuery, funcName.toLowerCase()),
          similarity(loweredQuery, funcPath.toLowerCase()),
        )
      })

      const bestScore = Math.min(...scores)
      bestMatches = funcPaths.filter((_file, i) => {
        return scores[i] === bestScore
      })
      confirm = bestScore > 0
    } else {
      bestMatches = funcPaths
    }

    if (!bestMatches.length) {
      throw new RadashiError(
        `No source file matching "${query}" was found in Radashi`,
      )
    }

    if (bestMatches.length > 1) {
      if (bestMatches.length > 1) {
        const selectedFunc = await prompt({
          type: 'autocomplete',
          name: 'selectedFunc',
          message: options.message || 'Select a function:',
          choices: bestMatches.map(f => ({
            title: f,
            value: f,
          })),
        })
        if (!selectedFunc) {
          throw new EarlyExitError('No function selected. Exiting...')
        }
        funcPath = selectedFunc
      } else {
        funcPath = bestMatches[0]

        if (confirm) {
          const shouldContinue = await prompt({
            type: 'confirm',
            name: 'shouldContinue',
            message:
              options.confirmMessage?.replace('{funcPath}', funcPath) ||
              `Is "${funcPath}" the function you wanted?`,
            initial: true,
          })

          if (!shouldContinue) {
            throw new EarlyExitError()
          }
        }
      }
    } else {
      funcPath = bestMatches[0]
    }
  }

  return {
    funcPath,
    funcName: funcPath.split('/').at(-1)!,
  }
}

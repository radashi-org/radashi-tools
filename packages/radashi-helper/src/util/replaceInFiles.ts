import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Load the contents of a list of file paths into memory, one at a
 * time, replacing their content with your `replacer` function.
 */
export function replaceInFiles(
  files: string[],
  replacer: (text: string, file: string) => string | void,
) {
  for (const file of files) {
    const originalContent = readFileSync(file, 'utf8')
    const newContent = replacer(originalContent, file)

    if (newContent !== undefined && newContent !== originalContent) {
      writeFileSync(file, newContent, 'utf8')
    }
  }
}

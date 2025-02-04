/**
 * This function assumes the `content` represents a barrel file, which
 * simply re-exports a list of modules. It also assumes you want to
 * export everything from the given `specifier`. Lastly, it assumes
 * the barrel is alphabetically sorted and all lines begin with
 * `export * from` and use single quotes for the specifiers.
 *
 * In other words, this function is brittle and purpose-built.
 */
export function addExportToBarrel(content: string, specifier: string) {
  const addedLine = `export * from '${specifier}'`
  const existingLines = content.split('\n')

  let insertIndex = Math.max(existingLines.length - 1, 0)

  for (let i = 0; i < existingLines.length; i++) {
    if (existingLines[i] && existingLines[i] > addedLine) {
      if (i === 0) {
        insertIndex = 0
        break
      }
      for (let j = i - 1; j >= 0; j--) {
        if (existingLines[j].length) {
          insertIndex = j + 1
          break
        }
      }
      break
    }
  }

  existingLines.splice(insertIndex, 0, addedLine)

  return existingLines.join('\n')
}

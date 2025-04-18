import $ from 'picospawn'
import { debug } from './debug'

export async function isFileDirty(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await $('git status --porcelain', [filePath])
    return stdout.trim().length > 0
  } catch (error) {
    debug(`Error checking file status: ${error}`)
    return false
  }
}

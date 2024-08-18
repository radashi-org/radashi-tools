export function replaceWordsInString(
  str: string,
  words: string[],
  replacement: string,
) {
  return str.replace(new RegExp(`\\b(${words.join('|')})\\b`, 'g'), replacement)
}

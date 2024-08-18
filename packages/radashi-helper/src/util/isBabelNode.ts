import { isObject, isString } from 'radashi'

export function isBabelNode(
  value: unknown,
): value is Record<string, any> & { type: string } {
  return isObject(value) && 'type' in value && isString(value.type)
}

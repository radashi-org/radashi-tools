export type PromptType = 'autocomplete' | 'text' | 'confirm' | 'select'

export interface PromptOptions<Type extends PromptType, Value> {
  type: Type
  name: string
  message: string
  choices?: { title: string; value: Value; description?: string }[]
  initial?: PromptResult<Type, Value>
  validate?: (value: PromptResult<Type, Value>) => string | true
}

export type PromptResult<
  Type extends PromptType,
  Value,
> = Type extends 'autocomplete'
  ? Value
  : Type extends 'text'
    ? string
    : Type extends 'confirm'
      ? boolean
      : Type extends 'select'
        ? Value
        : never

export type PromptHandler = <Type extends PromptType, const Value>(
  options: PromptOptions<Type, Value>,
) => Promise<PromptResult<Type, Value> | undefined>

export let prompt: PromptHandler

export function setPromptHandler(handler: PromptHandler) {
  prompt = handler
}

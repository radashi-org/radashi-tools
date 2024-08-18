import { parse } from '@babel/parser'
import { readFileSync } from 'node:fs'
import { traverse } from 'radashi'
import { isBabelNode } from './isBabelNode'

export function getExportedNames(
  file: string,
  options: { types?: boolean | 'only' } = {},
) {
  const typesOption = options.types ?? true

  let fileContents: string | undefined
  try {
    fileContents = readFileSync(file, 'utf8')
  } catch {
    return []
  }

  const parseResult = parse(fileContents, {
    plugins: [['typescript', { dts: file.endsWith('.d.ts') }]],
    sourceType: 'module',
    sourceFilename: file,
  })

  const names: Set<string> = new Set()
  const { program } = parseResult

  function isAllowed(node: any) {
    return (
      (typesOption !== 'only' &&
        (node.type === 'FunctionDeclaration' ||
          node.type === 'ClassDeclaration' ||
          (node.type === 'ExportSpecifier' && node.exportKind !== 'type'))) ||
      (typesOption !== false &&
        (node.type === 'TSInterfaceDeclaration' ||
          node.type === 'TSTypeAliasDeclaration' ||
          (node.type === 'ExportSpecifier' && node.exportKind === 'type')))
    )
  }

  traverse(program, (node, _key, _parent, context) => {
    if (isBabelNode(node)) {
      // Do not traverse past the top-level nodes.
      context.skip()

      if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration) {
          if (node.declaration.type === 'VariableDeclaration') {
            if (typesOption === 'only') {
              return
            }
            for (const declarator of node.declaration.declarations) {
              if (declarator.id.type === 'Identifier') {
                names.add(declarator.id.name)
              }
            }
          } else if (isAllowed(node.declaration)) {
            if (
              node.declaration.id &&
              node.declaration.id.type === 'Identifier'
            ) {
              names.add(node.declaration.id.name)
            }
          }
        } else if (node.specifiers) {
          for (const specifier of node.specifiers) {
            if (specifier.type === 'ExportSpecifier') {
              if (isAllowed(specifier)) {
                names.add(specifier.exported.name)
              }
            }
          }
        }
      } else if (node.type === 'ExportDefaultDeclaration') {
        if (typesOption !== 'only') {
          names.add('default')
        }
      }
    }
  })

  return Array.from(names).sort()
}

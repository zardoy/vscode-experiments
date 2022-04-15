import * as vscode from 'vscode'
import { camelCase } from 'change-case'
import { defaultJsSupersetLangsWithVue } from '@zardoy/vscode-utils/build/langs'
import { getExtensionSetting } from 'vscode-framework'
import pluralize from 'pluralize'

export const fromInsertCompletions = {
    value: false,
}

export const registerTweakTsSuggestions = () => {
    let fromInner = false
    vscode.languages.registerCompletionItemProvider(
        defaultJsSupersetLangsWithVue,
        {
            async provideCompletionItems(document, position) {
                // TODO also refactor with settings change
                const enableTweakTsSuggestions = getExtensionSetting('tweakTsSuggestions.enabled')
                const arrayItemTabstop = getExtensionSetting('tweakTsSuggestions.arrayItemTabstop')
                const expandMethodBeforeCurly = getExtensionSetting('tweakTsSuggestions.expandMethodBeforeCurly')
                if (fromInner || !enableTweakTsSuggestions || fromInsertCompletions.value) {
                    fromInner = false
                    fromInsertCompletions.value = false
                    return
                }

                // that's why the behaviour is so inconsistent
                if (document.getText(new vscode.Range(position.translate(undefined, -1), position)) !== '.') return
                console.time('tweak: fetch completions')
                fromInner = true
                const { items: sourceItems }: vscode.CompletionList = await vscode.commands.executeCommand(
                    'vscode.executeCompletionItemProvider',
                    document.uri,
                    position,
                    '.',
                )
                console.timeEnd('tweak: fetch completions')
                const itemsToInclude: vscode.CompletionItem[] = []
                const itemLists = {
                    sourceItems,
                    targetItems: itemsToInclude,
                }

                // won't work with valid unicode variables & in other cases (such as indexed access, on-method property access)
                const varNameOffset = /([^.]*$)/.exec(document.getText(new vscode.Range(position.with({ character: 0 }), position)))?.[1]?.length ?? 0
                const variableName = document.getText(document.getWordRangeAtPosition(position.translate(0, -varNameOffset - 1)))
                const arrayItemName = /(.+?)((?:e?s|sList))$/.test(variableName)
                    ? pluralize(variableName.endsWith('List') ? variableName.slice(0, -'list'.length) : variableName, 1)
                    : 'item'
                const arrayItemSnippet = arrayItemTabstop ? `\${1:${arrayItemName}}` : arrayItemName
                const beforeExistingMethod = expandMethodBeforeCurly
                    ? false
                    : document.getText(new vscode.Range(position.translate(undefined, 1), position)) === '('

                if (!beforeExistingMethod) {
                    tweakCompletionItem(itemLists, 'toString', vscode.CompletionItemKind.Method, item => {
                        item.additionalSnippetInsert = `()`
                        item.sortText = '105'
                        return item
                    })

                    // default 11
                    const arrayMethod = (sortText?: number) => (item: CompatibleCompletionItem) => {
                        const arrayItemSnippetLocal = arrayItemTabstop ? `(${arrayItemSnippet})` : arrayItemSnippet
                        item.additionalSnippetInsert = `(${arrayItemSnippetLocal} => $2)`
                        item.command = undefined
                        if (sortText !== undefined) item.sortText = sortText.toString()
                        return item
                    }

                    tweakCompletionItem(itemLists, 'map', vscode.CompletionItemKind.Method, arrayMethod(100))
                    tweakCompletionItem(itemLists, 'filter', vscode.CompletionItemKind.Method, arrayMethod(100))
                    tweakCompletionItem(itemLists, 'find', vscode.CompletionItemKind.Method, arrayMethod(100))
                    tweakCompletionItem(itemLists, 'forEach', vscode.CompletionItemKind.Method, arrayMethod(100))
                }

                tweakCompletionItem(itemLists, 'forof', vscode.CompletionItemKind.Snippet, item => {
                    item.insertText = new vscode.SnippetString((item.insertText as vscode.SnippetString).value.replace('$1', arrayItemSnippet))
                    return item
                })

                // TODO same for let
                tweakCompletionItem(itemLists, 'const', vscode.CompletionItemKind.Snippet, item => {
                    if (!item.documentation) return
                    const newName = getConstName(item)
                    if (!newName) return
                    item.insertText = new vscode.SnippetString((item.insertText as vscode.SnippetString).value.replace('name', newName))
                    item.replaceDocumentation = str => str.replace('name', newName)
                    return item
                })

                return itemsToInclude
            },
        },
        '.',
    )
}

const expressionParsers: Array<(expr: string) => string | void> = [
    expr => {
        const match = /^getExtensionSetting\(['"](.+)['"]\)$/.exec(expr)?.[1]
        if (!match) return
        return camelCase(match)
    },
    expr => {
        const dotIndex = expr.indexOf('.')
        if (dotIndex !== -1) expr = expr.slice(dotIndex + 1)
        const match = /(?:get|read|create|retrieve|modify|update|use)(.+?)\(/.exec(expr)?.[1]
        if (!match) return
        return match[0]!.toLowerCase() + match.slice(1)
    },
]

const getConstName = (item: vscode.CompletionItem) => {
    const doc = typeof item.documentation === 'object' ? item.documentation.value.split('\n')[2]! : item.documentation!
    const expression = doc.slice(doc.startsWith('let') ? 'let name = '.length : 'const name = '.length)
    for (const expressionParser of expressionParsers) {
        const parsed = expressionParser(expression)
        if (parsed) return parsed
    }

    return undefined
}

type CompatibleCompletionItem = vscode.CompletionItem & {
    additionalSnippetInsert?: string
    replaceDocumentation?: (str: string) => string | undefined
}
type NormalizedCompletionItem = CompatibleCompletionItem & {
    label: string
}

const getItemLabel = (label: string | vscode.CompletionItemLabel) => (typeof label === 'object' ? label.label : label)
const findItemWithLabelAndKind = (itemsList: vscode.CompletionItem[], label: string, kind: vscode.CompletionItemKind) =>
    itemsList.find(item => item.kind === kind && getItemLabel(item.label) === label)

const tweakCompletionItem = (
    itemLists: { targetItems: vscode.CompletionItem[]; sourceItems: vscode.CompletionItem[] },
    label: string,
    kind: vscode.CompletionItemKind,
    replaceItem: (sourceItem: NormalizedCompletionItem) => CompatibleCompletionItem | undefined,
) => {
    const searchItem = findItemWithLabelAndKind(itemLists.sourceItems, label, kind)
    // console.log('Item found for', label, !!searchItem)
    if (searchItem) {
        const itemToReplace = replaceItem({ ...searchItem, label })
        if (itemToReplace === undefined) return
        if (itemToReplace.sortText === undefined || itemToReplace.sortText === searchItem.sortText)
            itemToReplace.sortText = Number.isFinite(+itemToReplace.sortText!) ? (+itemToReplace.sortText! - 1).toString() : `${label.slice(0, -1)}1`

        if (itemToReplace.additionalSnippetInsert)
            itemToReplace.insertText = new vscode.SnippetString(
                `${
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    (typeof itemToReplace.insertText === 'string' ? itemToReplace.insertText : itemToReplace.insertText?.value) ||
                    getItemLabel(itemToReplace.label)
                }${itemToReplace.additionalSnippetInsert}`,
            )

        if (typeof itemToReplace.label !== 'object')
            itemToReplace.label = {
                label: itemToReplace.label,
                description: 'PATCHED',
            }

        const { documentation } = itemToReplace
        if (itemToReplace.replaceDocumentation && documentation) {
            const newDoc = itemToReplace.replaceDocumentation(typeof documentation === 'object' ? documentation.value : documentation)
            if (newDoc) itemToReplace.documentation = typeof documentation === 'object' ? new vscode.MarkdownString(newDoc) : newDoc
        }

        // remove obsolete
        if (itemToReplace.textEdit) itemToReplace.textEdit = undefined

        itemLists.targetItems.push(itemToReplace)
    }
}

import vscode from 'vscode'
import { oneOf } from '@zardoy/utils'
import { getExtensionCommandId, registerExtensionCommand, showQuickPick } from 'vscode-framework'

export const registerInsertCompletions = () => {
    registerExtensionCommand('insertCompletions', async () => {
        await vscode.commands.executeCommand(getExtensionCommandId('insertAutoCompletions'), { showQuickPick: true })
    })

    registerExtensionCommand(
        'insertAutoCompletions',
        // eslint-disable-next-line complexity
        async (
            _,
            {
                snippetType = 'all',
                kind = 'all',
                destruct = false,
                includeOptional = true,
                showQuickPick: showQuickPickToUser = false,
            }: { snippetType?: 'all' | 'each'; kind?: 'all' | 'method' | 'prop'; destruct?: boolean; includeOptional?: boolean; showQuickPick?: boolean } = {},
        ) => {
            const activeEditor = vscode.window.activeTextEditor
            if (!activeEditor || activeEditor.viewColumn === undefined) return
            // TODO how it make sense to run on each selection
            const activePos = activeEditor.selection.end
            const completions: vscode.CompletionList = await vscode.commands.executeCommand(
                'vscode.executeCompletionItemProvider',
                activeEditor.document.uri,
                activePos,
            )
            // normalizing buggy builtin TS behavior
            const jsxPropMode = completions.items.some(({ kind, filterText }) => kind === vscode.CompletionItemKind.Property && filterText?.endsWith('={$1}'))
            let isInJsx = jsxPropMode
            if (activePos.line > 0 && /^\s*<\S+$/.test(activeEditor.document.lineAt(activePos.line - 1).text)) isInJsx = true

            const completionsWithLabel = completions.items
                .map(({ label, kind, insertText }) => ({ label: typeof label === 'string' ? label : label.label, kind, insertText }))
                .filter(({ kind }) =>
                    jsxPropMode ? kind === vscode.CompletionItemKind.Property : oneOf(kind, vscode.CompletionItemKind.Field, vscode.CompletionItemKind.Method),
                )
            const kinds: vscode.CompletionItemKind[] = isInJsx ? [vscode.CompletionItemKind.Property] : []
            if (oneOf(kind, 'all', 'prop')) kinds.push(vscode.CompletionItemKind.Property, vscode.CompletionItemKind.Field)
            if (oneOf(kind, 'all', 'method')) kinds.push(vscode.CompletionItemKind.Method)

            console.debug({ isInJsx, jsxPropMode })

            const optInclude: boolean[] = []
            let completionsFiltered: ReturnType<typeof getFilteredCompletions>
            let regexFilter: string | RegExp | undefined
            const getFilteredCompletions = () =>
                completionsWithLabel
                    .filter(({ kind }) => kinds.includes(kind!))
                    .filter(({ label }) => regexFilter === undefined || label.match(regexFilter))
                    .filter(({ label }) => {
                        const completionRequired = !label.endsWith('?')
                        return optInclude.includes(completionRequired)
                    })

            if (showQuickPickToUser) {
                const selectedTypesRaw = await vscode.window.showQuickPick(
                    [
                        ...(isInJsx
                            ? []
                            : [
                                  {
                                      label: '$(symbol-field) Field',
                                      description: completionsWithLabel.filter(({ kind }) => kind === vscode.CompletionItemKind.Field).length.toString(),
                                      value: vscode.CompletionItemKind.Field,
                                      picked: true,
                                  },
                                  {
                                      label: '$(symbol-method) Method',
                                      description: completionsWithLabel.filter(({ kind }) => kind === vscode.CompletionItemKind.Method).length.toString(),
                                      value: vscode.CompletionItemKind.Method,
                                      picked: true,
                                  },
                              ]),
                        {
                            label: 'Required',
                            description: completionsWithLabel.filter(({ label }) => !label.endsWith('?')).length.toString(),
                            value: true,
                            picked: true,
                        },
                        {
                            label: '$(question) Optional',
                            description: completionsWithLabel.filter(({ label }) => label.endsWith('?')).length.toString(),
                            value: false,
                            picked: true,
                        },
                    ],
                    {
                        canPickMany: true,
                        title: 'Select types',
                    },
                )
                if (selectedTypesRaw === undefined) return
                // TODO 1
                if (selectedTypesRaw.every(({ description }) => description === '0')) {
                    await vscode.window.showWarningMessage('Selected zero completions')
                    return
                }

                const selectedTypes = selectedTypesRaw.map(({ value }) => value)
                if (!selectedTypes || selectedTypes.length === 0 || !selectedTypes.some(type => typeof type === 'boolean')) return
                for (const selectedType of selectedTypes)
                    if (typeof selectedType === 'boolean') optInclude.push(selectedType)
                    else kinds.push(selectedType)

                // TODO! preview suggestions
                const regexFilterQuickpick = vscode.window.createQuickPick()
                regexFilterQuickpick.title = 'Regex Filter'
                regexFilterQuickpick.placeholder = 'Press enter to skip filtering'
                const updateItems = () => {
                    regexFilterQuickpick.items = getFilteredCompletions()
                        .map(({ label, kind }) => ({
                            kind: isInJsx ? (label.startsWith('on') ? vscode.CompletionItemKind.Method : vscode.CompletionItemKind.Field) : kind,
                            label,
                        }))
                        .map(({ label, kind }) => {
                            const kindIconMap = {
                                [vscode.CompletionItemKind.Field]: '$(symbol-field)',
                                [vscode.CompletionItemKind.Method]: '$(symbol-method)',
                            }
                            return {
                                label: kind ? `${kindIconMap[kind]} ${label}` : label,
                                alwaysShow: true,
                            }
                        })
                }

                regexFilterQuickpick.onDidChangeValue(newUserValue => {
                    regexFilter = normalizeRegex(newUserValue)
                    updateItems()
                })
                updateItems()
                regexFilterQuickpick.show()
                await new Promise(resolve => {
                    regexFilterQuickpick.onDidAccept(resolve)
                })
                // esc
                if (regexFilterQuickpick.value === undefined) return
                const isInDestruct = isInJsx
                    ? false
                    : await showQuickPick(
                          [
                              {
                                  label: 'no',
                                  value: false,
                              },
                              {
                                  label: 'ye',
                                  value: true,
                              },
                          ],
                          { title: 'Is in destruct' },
                      )
                if (isInDestruct === undefined) return
                destruct = isInDestruct
                completionsFiltered = getFilteredCompletions()
                if (!isInDestruct && completionsFiltered.length > 1) {
                    const selectedSnippetType = await showQuickPick(
                        [
                            {
                                label: 'all',
                                value: 'all',
                            },
                            {
                                label: 'each',
                                value: 'each',
                            },
                        ],
                        { title: 'Select snippet type' },
                    )!
                    if (!selectedSnippetType) return
                    snippetType = selectedSnippetType as any
                }
            } else {
                optInclude.push(true)
                if (includeOptional) optInclude.push(false)
                completionsFiltered = getFilteredCompletions()
            }

            // console.log(kind, completions.items.filter(({ kind }) => kind === vscode.CompletionItemKind.Method)![0]!)
            // console.log(competionsFiltered.filter(({ label }) => typeof label !== 'string'))
            const snippet = new vscode.SnippetString()
            const tabstopNum = snippetType === 'all' ? 1 : undefined
            const insertNewLine = activeEditor.document.lineAt(activePos).isEmptyOrWhitespace
            for (const [i, { label: completionLabel, kind, insertText }] of completionsFiltered.entries()) {
                const rawInsert = destruct || isInJsx
                const textToInsert = typeof insertText === 'object' ? insertText.value : insertText ?? completionLabel
                if (isInJsx)
                    if (typeof insertText === 'object') {
                        // implementation is blurry and jsx-aware only
                        const [propStart, propEnding] = textToInsert.split('$1') as [string, string]
                        if (propEnding === undefined) throw new Error('Ensure you use TS 4.5+ and typescript.preferences.jsxAttributeCompletionStyle != none')
                        snippet.appendText(propStart)
                        snippet.appendTabstop(tabstopNum)
                        snippet.appendText(propEnding)
                    } else {
                        snippet.appendText(textToInsert)
                        snippet.appendText('={')
                        snippet.appendTabstop(tabstopNum)
                        snippet.appendText('}')
                    }
                else snippet.appendText(destruct || kind === vscode.CompletionItemKind.Method ? textToInsert : `${textToInsert}: `)

                if (!rawInsert) snippet.appendTabstop(tabstopNum)
                if (!isInJsx) snippet.appendText(',')

                if (i !== completionsFiltered.length - 1) snippet.appendText(insertNewLine ? '\n' : ' ')
            }

            await activeEditor.insertSnippet(snippet)
        },
    )
}

// from GitHub Manager
const normalizeRegex = (input: string) => {
    const regexMatch = /^\/.+\/(.*)$/.exec(input)
    if (!regexMatch) return input
    const pattern = input.slice(1, -regexMatch[1]!.length - 1)
    const flags = regexMatch[1]
    return new RegExp(pattern, flags)
}

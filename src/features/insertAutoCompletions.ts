import vscode from 'vscode'
import { oneOf } from '@zardoy/utils'
import { getExtensionCommandId, registerExtensionCommand, showQuickPick } from 'vscode-framework'

export const registerInsertAutoCompletions = () => {
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
            const completionsWithLabel = completions.items
                .map(({ label, kind }) => ({ label: typeof label === 'string' ? label : label.label, kind }))
                .filter(({ kind }) => oneOf(kind, vscode.CompletionItemKind.Field, vscode.CompletionItemKind.Method))
            const kinds: vscode.CompletionItemKind[] = []
            if (oneOf(kind, 'all', 'prop')) kinds.push(vscode.CompletionItemKind.Property, vscode.CompletionItemKind.Field)
            if (oneOf(kind, 'all', 'method')) kinds.push(vscode.CompletionItemKind.Method)
            let regexFilter: string | RegExp | undefined
            const optInclude: boolean[] = []
            if (includeOptional) optInclude.push(true)
            if (showQuickPickToUser) {
                const selectedTypesRaw = await vscode.window.showQuickPick(
                    [
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
                const regexFilterRaw = await vscode.window.showInputBox({
                    title: 'Filter Regex',
                })
                if (regexFilterRaw === undefined) return
                if (regexFilterRaw) regexFilter = normalizeRegex(regexFilterRaw)
                const isInDestruct = await showQuickPick(
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
                )!
                if (isInDestruct === undefined) return
                destruct = isInDestruct
                if (!isInDestruct) {
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
            }

            const completionsFiltered = completionsWithLabel
                .filter(({ kind }) => kinds.includes(kind!))
                .filter(({ label }) => regexFilter === undefined || label.match(regexFilter))
                .filter(({ label }) => {
                    const completionRequired = !label.endsWith('?')
                    return optInclude.includes(completionRequired)
                })
            // console.log(kind, completions.items.filter(({ kind }) => kind === vscode.CompletionItemKind.Method)![0]!)
            // console.log(competionsFiltered.filter(({ label }) => typeof label !== 'string'))
            const snippet = new vscode.SnippetString()
            const num = snippetType === 'all' ? 1 : undefined
            const insertNewLine = activeEditor.document.lineAt(activePos).isEmptyOrWhitespace
            for (let [i, { label: completionLabel, kind }] of completionsFiltered.entries()) {
                completionLabel = completionLabel.replace(/\?$/, '')
                snippet.appendText(destruct || kind === vscode.CompletionItemKind.Method ? completionLabel : `${completionLabel}: `)
                if (!destruct) snippet.appendTabstop(num)
                snippet.appendText(',')
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

import * as vscode from 'vscode'
import { defaultJsSupersetLangs } from '@zardoy/vscode-utils/build/langs'
import { getJsonCompletingInfo, jsonPathEquals, jsonValuesToCompletions } from '@zardoy/vscode-utils/build/jsonCompletions'
import { getLocation, findNodeAtLocation, parseTree, getNodeValue } from 'jsonc-parser'

export default () => {
    // vscode.commands.executeCommand
    vscode.languages.registerCompletionItemProvider(
        defaultJsSupersetLangs,
        {
            async provideCompletionItems(document, position, token, context) {
                const commandRange = document.getWordRangeAtPosition(position, /commands.executeCommand(<.+>)?\((['"].*['"]?|)\)/)
                const stringRange = document.getWordRangeAtPosition(position, /['"].*['"]/)
                const innerStringRange = stringRange?.with(stringRange.start.translate(0, 1), stringRange.end.translate(0, -1))
                if (!commandRange || !innerStringRange?.contains(position)) return
                if (position.character < commandRange.start.character + 'command("'.length) return
                const externalCommands = await vscode.commands.getCommands(true)
                return [...new Set([...externalCommands, ...siteCommands.map(([cmd]) => cmd)])].map(commandId => ({
                    label: { label: commandId },
                    documentation: siteCommands.find(([cmd]) => cmd === commandId)?.[1],
                    kind: vscode.CompletionItemKind.Value,
                    sortText: '180',
                    range: innerStringRange,
                }))
            },
        },
        "'",
        '"',
        '.',
    )

    // package.json keybindings commands
    vscode.languages.registerCompletionItemProvider(
        { language: 'json', pattern: '**/package.json' },
        {
            async provideCompletionItems(document, position, token, context) {
                const location = getLocation(document.getText(), document.offsetAt(position))
                const root = parseTree(document.getText())!
                const { path } = location
                const completingInfo = getJsonCompletingInfo(location, document, position)
                if (!completingInfo) return
                const { insideStringRange } = completingInfo ?? {}
                if (insideStringRange) {
                    const value: string = getNodeValue(findNodeAtLocation(root, path)!)!
                    const commands = await vscode.commands.getCommands(true)
                    if (jsonPathEquals(path, ['contributes', 'keybindings', '*', 'command']))
                        return jsonValuesToCompletions(
                            commands.map(cmd => (value.startsWith('-') ? `-${cmd}` : cmd)),
                            insideStringRange,
                        )
                    if (jsonPathEquals(path, ['contributes', 'keybindings', '*', 'mac'])) {
                        const { key } = getNodeValue(findNodeAtLocation(root, path.slice(0, -1))!) as { key?: string }
                        if (!key) return
                        return jsonValuesToCompletions([key.replaceAll('ctrl', 'cmd')], insideStringRange)
                    }

                    if (jsonPathEquals(path, ['contributes', 'keybindings', '*', 'key'])) {
                        const { key } = getNodeValue(findNodeAtLocation(root, path.slice(0, -1))!) as { key?: string }
                        if (!key) return
                        return jsonValuesToCompletions([key.replaceAll('cmd', 'ctrl')], insideStringRange)
                    }
                    // TODO key completions
                }

                if (jsonPathEquals(path, ['contributes', 'configuration', 'properties', '*', 'default'])) {
                    const config = findNodeAtLocation(root, path.slice(0, -1))!
                    const { type, enum: enumStrings } = getNodeValue(config)
                    if (type === 'boolean') return jsonValuesToCompletions(['true', 'false'], undefined, true)
                    if (type === 'string' && enumStrings)
                        return jsonValuesToCompletions(insideStringRange ? enumStrings : enumStrings.map(str => `"${str}"`), insideStringRange, true)
                    return
                }

                return undefined
            },
        },
        '"',
        ':',
    )
}

const getConfigurationDefaultCompletions = (document: vscode.TextDocument) => {}

// as 1.71.0
const siteCommands: Array<[string, string]> = [
    ['vscode.executeDocumentHighlights', 'Execute document highlight provider.'],
    ['vscode.executeDocumentSymbolProvider', 'Execute document symbol provider.'],
    ['vscode.executeFormatDocumentProvider', 'Execute document format provider.'],
    ['vscode.executeFormatRangeProvider', 'Execute range format provider.'],
    ['vscode.executeFormatOnTypeProvider', 'Execute format on type provider.'],
    ['vscode.executeDefinitionProvider', 'Execute all definition providers.'],
    ['vscode.executeTypeDefinitionProvider', 'Execute all type definition providers.'],
    ['vscode.executeDeclarationProvider', 'Execute all declaration providers.'],
    ['vscode.executeImplementationProvider', 'Execute all implementation providers.'],
    ['vscode.executeReferenceProvider', 'Execute all reference providers.'],
    ['vscode.executeHoverProvider', 'Execute all hover providers.'],
    ['vscode.executeSelectionRangeProvider', 'Execute selection range provider.'],
    ['vscode.executeWorkspaceSymbolProvider', 'Execute all workspace symbol providers.'],
    ['vscode.prepareCallHierarchy', 'Prepare call hierarchy at a position inside a document'],
    ['vscode.provideIncomingCalls', 'Compute incoming calls for an item'],
    ['vscode.provideOutgoingCalls', 'Compute outgoing calls for an item'],
    ['vscode.executeDocumentRenameProvider', 'Execute rename provider.'],
    ['vscode.executeLinkProvider', 'Execute document link provider.'],
    ['vscode.provideDocumentSemanticTokensLegend', 'Provide semantic tokens legend for a document'],
    ['vscode.provideDocumentSemanticTokens', 'Provide semantic tokens for a document'],
    ['vscode.provideDocumentRangeSemanticTokensLegend', 'Provide semantic tokens legend for a document range'],
    ['vscode.provideDocumentRangeSemanticTokens', 'Provide semantic tokens for a document range'],
    ['vscode.executeCompletionItemProvider', 'Execute completion item provider.'],
    ['vscode.executeSignatureHelpProvider', 'Execute signature help provider.'],
    ['vscode.executeCodeLensProvider', 'Execute code lens provider.'],
    ['vscode.executeCodeActionProvider', 'Execute code action provider.'],
    ['vscode.executeDocumentColorProvider', 'Execute document color provider.'],
    ['vscode.executeColorPresentationProvider', 'Execute color presentation provider.'],
    ['vscode.executeInlayHintProvider', 'Execute inlay hints provider'],
    ['vscode.resolveNotebookContentProviders', 'Resolve Notebook Content Providers'],
    [
        'vscode.open',
        'Opens the provided resource in the editor. Can be a text or binary file, or an http(s) URL. If you need more control over the options for opening a text file, use vscode.window.showTextDocument instead.',
    ],
    ['vscode.openWith', 'Opens the provided resource with a specific editor.'],
    ['vscode.diff', 'Opens the provided resources in the diff editor to compare their contents.'],
    ['vscode.removeFromRecentlyOpened', 'Removes an entry with the given path from the recently opened list.'],
    ['vscode.openIssueReporter', 'Opens the issue reporter with the provided extension id as the selected source'],
    ['vscode.setEditorLayout', 'Sets the editor layout.'],
    [
        'vscode.openFolder',
        'Open a folder or workspace in the current window or new window depending on the newWindow argument. Note that opening in the same window will shutdown the current extension host process and start a new one on the given folder/workspace unless the newWindow parameter is set to true.',
    ],
]

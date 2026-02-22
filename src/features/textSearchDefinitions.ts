import { commands, Location, type LocationLink, window, workspace } from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'
import { Utils } from 'vscode-uri'

/** @deprecated Its too slow and uneffective, don't use it. Use workspaceSymbolDefinition instead */
export default () => {
    registerExtensionCommand('peekTextSearchDefinitions', runTextSearchDefinitions)
}

const runTextSearchDefinitions = async (
    _,
    { regex = undefined, glob = undefined as string | undefined, excludeDefault = true, maxResults = 120, goToMode = undefined as string | undefined } = {},
) => {
    const editor = window.activeTextEditor
    if (!editor) return
    const { document } = editor
    const position = editor.selection.active
    const wordRange = editor.document.getWordRangeAtPosition(position, regex)
    if (!wordRange) return
    const word = document.getText(wordRange)
    const configuration = workspace.getConfiguration()
    const defaultSearchExcludeGlob = excludeDefault
        ? Object.entries({ ...configuration.get('files.exclude')!, ...configuration.get('search.exclude')! })
              .filter(([key, val]: [string, any]) => val && !key.includes('{'))
              .map(([key]) => key)
        : []
    // TODO bad default, might need reassigning in keybindings
    const fileExt = Utils.basename(document.uri).split('.').pop()!
    const globPerExt = {
        ts: 'ts,tsx,vue',
        tsx: 'ts,tsx',
        vue: 'vue,js,ts',
        js: 'js,jsx,vue',
    }
    const deafultGlob = globPerExt[fileExt] ? `{${globPerExt[fileExt]}}` : fileExt
    const files = await workspace.findFiles(glob ?? `**/*.${deafultGlob}`, `**/{${defaultSearchExcludeGlob.join(',')}}`, maxResults /* , tokenSource.token */)
    console.log(`[universeDefinitions] going to check ${files.length} files`)
    const documents = await Promise.all(files.map(uri => workspace.openTextDocument(uri)))
    const locations: Location[] = []
    let textHits = 0
    for (const document of documents) {
        const text = document.getText()
        let index = -1

        while ((index = text.indexOf(word, index + 1)) !== -1) {
            textHits++

            const requestPos = document.positionAt(index)
            const definitions: Array<LocationLink | Location> = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, requestPos)
            for (const definition of definitions) {
                const range = 'targetRange' in definition ? definition.targetSelectionRange ?? definition.targetRange : definition.range
                const uri = 'targetUri' in definition ? definition.targetUri : definition.uri
                if (range.contains(requestPos) && uri.toString() === document.uri.toString()) locations.push(new Location(uri, range))
            }
        }
    }

    goToMode ??= workspace.getConfiguration('editor').get('gotoLocation.multipleReferences') ?? 'peek'
    console.log(`[universeDefinitions] done, checked ${textHits} positions`)
    if (locations.length === 0) {
        void window.showWarningMessage(`No definitions for ${word} found`)
        return
    }

    await commands.executeCommand('editor.action.peekLocations', locations[0]?.uri, locations[0]?.range.start, locations, goToMode)
}

import * as vscode from 'vscode'
import { defaultJsSupersetLangsWithVue } from '@zardoy/vscode-utils/build/langs'
import escapeStringRegexp from 'escape-string-regexp'

// To check: if (true) {console.time('dsklfj')}
export default () => {
    // not taking escaping into account
    const regex = /(console.time(?:End)?)\((?<Q>'|")(.+)\k<Q>\)/
    vscode.languages.registerRenameProvider(defaultJsSupersetLangsWithVue, {
        prepareRename(document, position, token) {
            const range = document.getWordRangeAtPosition(position, regex)
            if (!range) return
            regex.lastIndex = 0
            const match = regex.exec(document.getText(range))!
            return range.with({
                // 2 symbols: bracket + quote
                start: range.start.translate(0, match[1]!.length + 2),
                end: range.end.translate(0, -2),
            })
        },
        provideRenameEdits(document, position, newName, token) {
            const workspaceEdit = new vscode.WorkspaceEdit()
            const oldText = document.getText(this.prepareRename!(document, position, token) as vscode.Range)
            const matches = document.getText().matchAll(new RegExp(regex.toString().slice(1, -1).replace('(.+)', escapeStringRegexp(oldText)), 'g'))
            for (const match of matches) {
                const pos = document.positionAt(match.index!)
                workspaceEdit.replace(document.uri, new vscode.Range(pos.translate(0, match[1]!.length + 2), pos.translate(0, match[0]!.length - 2)), newName)
            }

            return workspaceEdit
        },
    })
}

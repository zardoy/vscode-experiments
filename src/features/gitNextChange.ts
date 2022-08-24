import * as vscode from 'vscode'
import { CommandHandler, registerExtensionCommand } from 'vscode-framework'
import { getGitActiveRepoOrThrow } from '../git-api'

export default () => {
    const gitNextOrPreviousChange: CommandHandler = async ({ command }) => {
        const isNextChange = command === 'gitNextChange'
        const repo = getGitActiveRepoOrThrow()
        if (!repo) return
        const rightEditor = detectGitTabTextEditor()
        if (!rightEditor) return
        const prevSelection = rightEditor.selection
        const runPreviousOrNextChange = async (isNext: boolean) => {
            await vscode.commands.executeCommand(isNext ? 'workbench.action.compareEditor.nextChange' : 'workbench.action.compareEditor.previousChange')
        }
        const performFileMove = () => {
            const changesNames = ['indexChanges', 'mergeChanges', 'workingTreeChanges']
            for (const [i, changes] of [indexChanges, mergeChanges, workingTreeChanges].entries()) {
                const fileIndex = changes.findIndex(({ uri }) => {
                    return rightEditor.document.uri.path === uri.path
                })
                if (fileIndex === -1) continue
                const { uri } = changes[fileIndex + (isNextChange ? 1 : -1)] ?? {}
                void runPreviousOrNextChange(!isNextChange)
                if (!uri) {
                    void vscode.window.showInformationMessage(`Reached ${isNextChange ? 'last' : 'first'} change file in ${changesNames[i]}`)
                    return
                }
                vscode.commands.executeCommand('git.openChange', uri).then(() => {
                    const nextEditor = detectGitTabTextEditor()
                    if (!nextEditor) return

                    const { document } = nextEditor
                    const pos = isNextChange ? new vscode.Position(0, 0) : document.lineAt(document.lineCount - 1).range.end
                    nextEditor.selections = [new vscode.Selection(pos, pos)]
                })
            }
        }
        const { indexChanges, mergeChanges, workingTreeChanges } = repo.state
        let posChanged = false
        const { dispose } = vscode.window.onDidChangeTextEditorSelection(async ({ textEditor }) => {
            if (textEditor.document.uri.toString() !== rightEditor.document.uri.toString()) return
            posChanged = true
            dispose()
            const doFileMove = !textEditor.selection.active[isNextChange ? 'isAfter' : 'isBefore'](prevSelection.active)
            if (doFileMove) performFileMove()
        })
        await runPreviousOrNextChange(isNextChange)
        if (!posChanged) {
            performFileMove()
        }
    }

    registerExtensionCommand('gitNextChange', gitNextOrPreviousChange)
    registerExtensionCommand('gitPreviousChange', gitNextOrPreviousChange)
}

const detectGitTabTextEditor = () => {
    const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input
    if (!(input instanceof vscode.TabInputTextDiff) || input?.original?.scheme !== 'git') return
    return vscode.window.visibleTextEditors.find(({ document }) => document.uri.toString() === input.modified.toString())!
}

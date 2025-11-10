import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'
import { getGitActiveRepoOrThrow } from '../git-api'

export default () => {
    registerExtensionCommand('fixedGitStageFile', async () => {
        await vscode.commands.executeCommand('git.stage')
        const repo = getGitActiveRepoOrThrow()
        if (!repo) return
        const currentUrl = vscode.window.activeTextEditor?.document.uri
        if (!currentUrl) return
        if ([...repo.state.indexChanges, ...repo.state.workingTreeChanges, ...repo.state.mergeChanges].some(x => x.uri.fsPath === currentUrl.fsPath)) {
            return
        }

        const paths = [currentUrl.fsPath]
        await repo.add(paths)
    })
}

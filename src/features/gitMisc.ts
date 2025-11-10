import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'
import { getGitActiveRepoOrThrow } from '../git-api'

export default () => {
    registerExtensionCommand('fixedGitStageFile', async () => {
        const repo = getGitActiveRepoOrThrow()
        if (!repo) return
        const currentUrl = vscode.window.activeTextEditor?.document.uri
        if (!currentUrl) return
        await vscode.commands.executeCommand('git.stage')
        if ([...repo.state.indexChanges, ...repo.state.workingTreeChanges, ...repo.state.mergeChanges].some(x => x.uri.fsPath === currentUrl.fsPath)) {
            return
        }

        const paths = [currentUrl.fsPath]
        await repo.add(paths)
    })
}

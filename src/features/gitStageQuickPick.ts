import * as vscode from 'vscode'
import { CommandHandler, registerExtensionCommand } from 'vscode-framework'
import { MaybePromise } from 'vscode-framework/build/util'
import { noCase } from 'change-case'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'
import { getGitActiveRepoOrThrow, GitChange, GitRepository } from '../git-api'

export default () => {
    const gitFilesCommand =
        (
            repoPickChanges: (repoState: GitRepository['state']) => GitChange[],
            apllyPaths: (repo: GitRepository, paths: string[]) => MaybePromise<void>,
        ): CommandHandler =>
        async ({ command }, immediateAction?) => {
            const repo = getGitActiveRepoOrThrow()
            if (!repo) return
            const changes = repoPickChanges(repo.state)
            const currentlyFocusedChangeIdx = changes.findIndex(({ uri }) => uri.fsPath === vscode.window.activeTextEditor?.document.uri.fsPath)
            const currentlyFocusedChange = changes[currentlyFocusedChangeIdx]
            let selectedUris: vscode.Uri[] | undefined
            if (immediateAction && currentlyFocusedChange && immediateAction === 'current') selectedUris = [currentlyFocusedChange.uri]
            else
                selectedUris = await showQuickPick(
                    changes.map(({ uri }) => {
                        const relativePath = vscode.workspace.asRelativePath(uri)
                        return {
                            label: relativePath,
                            value: uri,
                        }
                    }),
                    {
                        canPickMany: true,
                        title: noCase(command),
                        initialSelectedIndex: currentlyFocusedChangeIdx,
                    },
                )
            if (!selectedUris) return
            await apllyPaths(
                repo,
                selectedUris.map(({ fsPath }) => fsPath),
            )
        }

    registerExtensionCommand(
        'gitStageFiles',
        gitFilesCommand(
            repo => repo.workingTreeChanges,
            async (repo, paths) => repo.add(paths),
        ),
    )
    registerExtensionCommand(
        'gitUnstageFiles',
        gitFilesCommand(
            repo => repo.indexChanges,
            async (repo, paths) => repo.revert(paths),
        ),
    )
    registerExtensionCommand(
        'gitRevertFiles',
        gitFilesCommand(
            repo => repo.workingTreeChanges,
            async (repo, paths) => repo.clean(paths),
        ),
    )
}

import * as vscode from 'vscode'
import { CommandHandler, getExtensionCommandId, registerExtensionCommand, showQuickPick } from 'vscode-framework'
import { MaybePromise } from 'vscode-framework/build/util'
import { noCase } from 'change-case'
import { getGitActiveRepoOrThrow, GitChange, GitRepository } from '../git-api'

export default () => {
    const gitFilesCommand =
        (
            repoPickChanges: (repoState: GitRepository['state']) => GitChange[],
            apllyPaths: (repo: GitRepository, paths: string[]) => MaybePromise<void>,
        ): CommandHandler =>
        async ({ command }) => {
            const repo = getGitActiveRepoOrThrow()
            if (!repo) return
            const changes = repoPickChanges(repo.state)
            const selectedUris = await showQuickPick(
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

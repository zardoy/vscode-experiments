import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { registerExtensionCommand } from 'vscode-framework'
import { normalizeRegex } from '@zardoy/vscode-utils/build/settings'
import { ensureArray } from '@zardoy/utils'

interface CodeActionFilter {
    exact?: string
    // or
    regex?: string
}

interface ApplyCodeActionArg {
    filters: CodeActionFilter | CodeActionFilter[]
    /** @default first */
    apply?: 'first' | 'all'
    /** @default false */
    notFoundNotify?: false | 'warning'
    /** To show in notFoundNotify */
    name?: string
}

export default () => {
    registerExtensionCommand(
        'applyCodeaction',
        async (
            _,
            {
                filters,
                apply = 'first',
                notFoundNotify = false,
                name = ensureArray(filters)
                    .map(({ exact, regex }) => String(exact ?? regex))
                    .join(', '),
            }: ApplyCodeActionArg,
        ) => {
            const editor = getActiveRegularEditor()
            if (!editor) return
            const { document, selection } = editor
            const codeActions: vscode.CodeAction[] = await vscode.commands.executeCommand('vscode.executeCodeActionProvider', document.uri, selection)

            const applyCodeaction = async (codeAction: vscode.CodeAction) => {
                const { edit, command } = codeAction
                if (edit) await vscode.workspace.applyEdit(edit)
                if (command) await vscode.commands.executeCommand(command.command, ...(command.arguments ?? []))
            }

            // eslint-disable-next-line curly
            for (const codeAction of codeActions) {
                for (const { exact, regex } of ensureArray(filters)) {
                    if ([exact, regex].every(a => a === undefined)) {
                        void vscode.window.showWarningMessage(`Code action ${name} has empty filter. Remove it suppress this warning`)
                        continue
                    }

                    // eslint-disable-next-line unicorn/prefer-regexp-test
                    if (codeAction.title === exact || codeAction.title.match(normalizeRegex(regex!))) {
                        // eslint-disable-next-line no-await-in-loop
                        await applyCodeaction(codeAction)
                        if (apply === 'first') return
                    }
                }
            }

            if (notFoundNotify === 'warning') void vscode.window.showWarningMessage(`Can't find code action ${name} to apply`)
        },
    )
}

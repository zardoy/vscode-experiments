import * as vscode from 'vscode'
import { extensionCtx, getExtensionSetting, registerActiveDevelopmentCommand, registerExtensionCommand, registerNoop, setDebugEnabled } from 'vscode-framework'
import { range } from 'rambda'
import { getCurrentWorkspaceRoot } from '@zardoy/vscode-utils/build/fs'
import { registerAlwaysTab } from './features/specialTab'
import { registerTsCodeactions } from './features/tsCodeactions'
import { registerRegexCodeActions } from './features/regexCodeactions'
import { registerAddVscodeImport } from './features/addVscodeImport'
import { registerAddImport } from './features/addImport'
import { registerFixedSurroundIf } from './features/fixedSurroundIf'
import { registerRemoveUnusedImports } from './features/removeUnusedImports'
import { registerPickProblemsBySource } from './features/problemsBySource'
import { registerAutoAlignImport } from './features/alignImport'
import { registerStatusBarProblems } from './features/statusbarProblems'
import { registerNextLetterSwapCase } from './features/nextLetterSwapCase'
import { registerFixCss } from './features/fixCss'
import { registerInsertCompletions } from './features/insertCompletions'
import { registerCopyVariableName } from './features/copyVariableName'
import { registerSignatureCompletions } from './features/signatureCompletions'
import { registerReactAwareRename } from './features/reactAwareRename'
import { registerGoToMatchingTagOrPair } from './features/goToMatchingTagOrPair'
import { registerInsertTag } from './features/insertTag'
import { registerAutoCloseTag } from './features/autoCloseTag'
import { registerOpenInWebstorm } from './features/openInWebstorm'
import { registerCopyFileName } from './features/copyFileName'
import { registerGoToNextProblemInFile } from './features/goToNextProblemInFile'
import { registerFixedPaste } from './features/fixedPaste'
import { registerOpenRepositoryOfActiveExtension } from './features/openRepositoryOfActiveExtension'
import { registerTweakTsSuggestions } from './features/tweakTsSuggestions'
import { registerCopyCurrentWorkspacePath } from './features/copyCurrentWorkspacePath'
import { registerEnsureGitUser } from './features/ensureGitUser'
import { registerInsertComma } from './features/insertComma'
import { registerSuggestDefaultImportName } from './features/suggestDefaultImportName'
import { registerProductIconReference } from './features/productIconReference'
import { registerSelectLineContents } from './features/selectLineContents'
import { registerCutLineContents } from './features/cutLineContents'
import { registerCutLineContentsPreserve } from './features/cutLineContentsPreserve'
import typeDecorations from './features/typeDecorations'

export const activate = () => {
    // preserve camelcase identifiers (only vars for now)
    // preserveCamelCase()
    registerTsCodeactions()
    registerRegexCodeActions()
    registerAlwaysTab()
    registerAddVscodeImport()
    registerAddImport()
    registerFixedSurroundIf()
    registerRemoveUnusedImports()
    registerPickProblemsBySource()
    registerAutoAlignImport()
    registerStatusBarProblems()
    // registerOnTypeFormatter()
    registerNextLetterSwapCase()
    registerFixCss()
    registerInsertCompletions()
    registerCopyVariableName()
    registerSignatureCompletions()
    registerReactAwareRename()
    registerGoToMatchingTagOrPair()
    registerInsertTag()
    registerAutoCloseTag()
    registerOpenInWebstorm()
    registerCopyFileName()
    registerGoToNextProblemInFile()
    registerFixedPaste()
    registerOpenRepositoryOfActiveExtension()
    registerTweakTsSuggestions()
    registerCopyCurrentWorkspacePath()
    registerEnsureGitUser()
    registerInsertComma()
    registerSuggestDefaultImportName()
    registerProductIconReference()
    registerSelectLineContents()
    registerCutLineContents()
    registerCutLineContentsPreserve()
    typeDecorations()

    // vscode.languages.registerSelectionRangeProvider('*', {
    //     provideSelectionRanges(document, positions, token) {

    //     }
    // })

    // vscode.languages.registerDocumentSemanticTokensProvider('typescript', {

    // }, {})

    registerExtensionCommand('openUrl', async (_, url: string) => {
        // to test: https://regex101.com/?regex=.%2B%3A.%2B%3B?&flags=gi
        await vscode.env.openExternal(url as any)
    })

    registerExtensionCommand('fixedTerminalMaximize', async () => {
        await vscode.commands.executeCommand('workbench.action.toggleMaximizedPanel')
        await new Promise(resolve => {
            setTimeout(resolve, 50)
        })
        await vscode.commands.executeCommand('workbench.action.terminal.scrollUpPage')
        for (const i of range(0, 3)) await vscode.commands.executeCommand('workbench.action.terminal.scrollDown')
    })

    registerNoop('Better Rename', () => {
        const decoration = vscode.window.createTextEditorDecorationType({
            dark: {
                before: {
                    contentIconPath: extensionCtx.asAbsolutePath('resources/editDark.svg'),
                },
            },
            light: {
                before: {
                    contentIconPath: extensionCtx.asAbsolutePath('resources/edit.svg'),
                },
            },
            // rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        })
        if (!vscode.window.activeTextEditor) throw new Error('no activeTextEditor')
        const pos = vscode.window.activeTextEditor.selection.active
        vscode.window.activeTextEditor.setDecorations(decoration, [
            {
                range: new vscode.Range(pos, pos.translate(0, 1)),
            },
        ])
    })

    if (getExtensionSetting('enableDebug')) setDebugEnabled(true)

    registerActiveDevelopmentCommand(() => {
        const decoration = vscode.window.createTextEditorDecorationType({
            after: {
                // https://code.visualstudio.com/api/references/theme-color#editor-colors
                color: new vscode.ThemeColor('editorGhostText.foreground'),
                contentText: 'test!',

            },
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        })
        // https://code.visualstudio.com/api/references/commands
        // const hover: vscode.Hover[] = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, pos)
        // extract with /: (.+)/
        // regexp:
        // : (space)
        // = (space)
        vscode.window.onDidChangeTextEditorSelection(({ textEditor, selections }) => {
            const pos = selections[0]!.end
            textEditor.setDecorations(decoration, [
                {
                    range: new vscode.Range(pos.translate(0, -1), pos),
                },
            ])
        })
    })

    // registerActiveDevelopmentCommand(async () => {
    //     await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.joinPath(getCurrentWorkspaceRoot().uri, 'src'));
    // })
}

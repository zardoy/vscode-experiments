import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand, setDebugEnabled } from 'vscode-framework'
import { range } from 'rambda'
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
import { registerRenameFileParts } from './features/renameFileParts'
import typeDecorations from './features/typeDecorations'
import autoRemoveSemicolon from './features/autoRemoveSemicolon'
import printDocumentUri from './features/printDocumentUri'
import renameConsoleTime from './features/renameConsoleTime'
import { registerRenameVariableParts } from './features/renameVariableParts'
import expandTag from './features/expandTag'
import tabsWithNumbers from './features/tabsWithNumbers'
import { initGitApi } from './git-api'
import gitNextChange from './features/gitNextChange'
import turnCommentIntoJsdoc from './features/turnCommentIntoJsdoc'
import applyCreatedCodeTransformers from './features/applyCreatedCodeTransformers'
import newTerminalWithSameCwd from './features/newTerminalWithSameCwd'
import vscodeDevCompletions from './features/vscodeDevCompletions'
import toggleExtHostOutput from './features/toggleExtHostOutput'
import completionsKindPlayground from './features/completionsKindPlayground'
import autoEscapeJson from './features/autoEscapeJson'
import gitStageQuickPick from './features/gitStageQuickPick'
import githubEnvTerminal from './features/githubEnvTerminal'
import indentEmptyLineOnClick from './features/autoIndentEmptyLine'
import insertFileName from './features/insertFileName'
import tsPluginIntegrations from './features/tsPluginIntegrations'
import goToHighlightedLocations from './features/goToHighlightedLocations'
import tsHighlightedKeywordsReferences from './features/tsHighlightedKeywordsReferences'
import autoRenameJsx from './features/autoRenameJsx'
import openReferencesInView from './features/openReferencesInView'
import statusbarOccurrencesCount from './features/statusbarOccurrencesCount'
import generateGitlabPush from './features/generateGitlabPush'
import removedCommands from './removedCommands'
import inspectCompletionsDetails from './features/inspectCompletionsDetails'

export const activate = () => {
    void initGitApi()

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
    autoRemoveSemicolon()
    printDocumentUri()
    renameConsoleTime()
    registerRenameVariableParts()
    expandTag()
    tabsWithNumbers()
    gitNextChange()
    turnCommentIntoJsdoc()
    applyCreatedCodeTransformers()
    newTerminalWithSameCwd()
    vscodeDevCompletions()
    toggleExtHostOutput()
    completionsKindPlayground()
    autoEscapeJson()
    gitStageQuickPick()
    githubEnvTerminal()
    indentEmptyLineOnClick()
    insertFileName()
    tsPluginIntegrations()
    goToHighlightedLocations()
    tsHighlightedKeywordsReferences()
    autoRenameJsx()
    openReferencesInView()
    statusbarOccurrencesCount()
    generateGitlabPush()
    registerRenameFileParts()
    removedCommands()
    inspectCompletionsDetails()

    registerExtensionCommand('fixedTerminalMaximize', async () => {
        await vscode.commands.executeCommand('workbench.action.toggleMaximizedPanel')
        await new Promise(resolve => {
            setTimeout(resolve, 50)
        })
        await vscode.commands.executeCommand('workbench.action.terminal.scrollUpPage')
        // eslint-disable-next-line no-await-in-loop
        for (const i of range(0, 3)) await vscode.commands.executeCommand('workbench.action.terminal.scrollDown')
    })

    if (getExtensionSetting('enableDebug')) setDebugEnabled(true)
}

import * as vscode from 'vscode'
import { oneOf } from '@zardoy/utils'

export const jsLangs = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact']

export const notSingleSursor = () =>
    vscode.window.activeTextEditor!.selections.length > 1 ||
    !vscode.window.activeTextEditor!.selection.start.isEqual(vscode.window.activeTextEditor!.selection.end)

export const notFoundModule = (problem: vscode.Diagnostic) => oneOf(problem.code, 2552, 2304) && /'(.+?)'/.exec(problem.message)?.[1]

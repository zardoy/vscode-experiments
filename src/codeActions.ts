import vscode from 'vscode'

export const jsLangs = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact']

export const notSingleSursor = () =>
    vscode.window.activeTextEditor!.selections.length > 1 ||
    !vscode.window.activeTextEditor!.selection.start.isEqual(vscode.window.activeTextEditor!.selection.end)

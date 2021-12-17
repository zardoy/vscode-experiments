/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode'
import { groupBy, pluck, sortBy } from 'rambda'
import { getExtensionSetting } from 'vscode-framework'
export const registerStatusBarProblems = () => {
    const setting = getExtensionSetting('features.statusBarDiagnostic')
    if (setting === 'disabled') return
    const severityColorMap = {
        Hint: '#0000BB',
        Error: new vscode.ThemeColor('statusBarItem.errorBackground'),
        Warning: new vscode.ThemeColor('statusBarItem.warningBackground'),
    }
    type Severity = keyof typeof severityColorMap
    const prevStatusbarItems: Record<Severity, vscode.StatusBarItem | undefined> = {
        // TODO prefil
        Error: undefined,
        Hint: undefined,
        Warning: undefined,
    }
    const removeSeverity = (sev: Severity) => {
        const item = prevStatusbarItems[sev]
        if (!item) return
        item.hide()
        item.dispose()
        prevStatusbarItems[sev] = undefined
    }

    const cleanStatusbarItems = () => {
        for (const sev of Object.keys(prevStatusbarItems)) removeSeverity(sev)
    }

    const updateDiagnostics = () => {
        const editor = vscode.window.activeTextEditor
        if (editor === undefined || editor.viewColumn === undefined) {
            cleanStatusbarItems()
            return
        }

        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri)

        const bySeverity = groupBy(({ severity }) => vscode.DiagnosticSeverity[severity]!, diagnostics)
        for (const [severity, color] of Object.entries(severityColorMap)) {
            const problems = bySeverity[severity]
            if (!problems) {
                removeSeverity(severity)
                continue
            }

            const needsShow = prevStatusbarItems[severity] === undefined
            const item = prevStatusbarItems[severity] ?? vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10_000)
            const mostSource = sortBy(
                ([, diagnostic]) => diagnostic.length,
                Object.entries(groupBy(({ source }) => source ?? severity.toLowerCase(), problems)),
            )[0]![0]
            item.text = `${mostSource.toUpperCase()} ${problems.length}`
            if (setting === 'bgColor' && severity === 'Hint') item.color = color
            else item.backgroundColor = color

            if (needsShow) {
                item.show()
                prevStatusbarItems[severity] = item
            }
        }
    }

    vscode.window.onDidChangeActiveTextEditor(() => {
        updateDiagnostics()
    })
    vscode.languages.onDidChangeDiagnostics(({ uris }) => {
        updateDiagnostics()
    })
    updateDiagnostics()
}

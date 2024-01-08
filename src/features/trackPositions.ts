import * as vscode from 'vscode'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'
import { Settings, VSCodeQuickPickItem, extensionCtx, registerExtensionCommand } from 'vscode-framework'

export const enableIf: keyof Settings = 'trackDocumentPositions.enable'

export default () => {
    const disposables = [] as vscode.Disposable[]

    type OurKind = vscode.TextEditorSelectionChangeKind | 'focus-out' | 'text-change' | 'editor-open'

    type History = Array<[pos: vscode.Position, kind?: OurKind]>

    const historyPerEditor = new Map<string, History>()
    let history: History
    let previousUri: string | undefined
    let currentUri: string | undefined
    let onHistoryUpdate: (() => void) | undefined

    const changeHistory = () => {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.uri.toString() === currentUri) return
        const key = editor.document.uri.toString()
        history = historyPerEditor.get(key) ?? []
        historyPerEditor.set(key, history)
        previousUri = currentUri
        currentUri = key.toString()
    }

    let dontWriteTillNextChange = false
    let lastPosition: vscode.Position | undefined

    const pushPosition = (kind?: OurKind, forceAdd = false) => {
        if (dontWriteTillNextChange || !(history as any)) return
        const position = kind === 'focus-out' ? lastPosition : vscode.window.activeTextEditor?.selection.active
        const lastHistoryPos = history.at(-1)?.[0]
        if (!position) return
        if (!forceAdd && lastHistoryPos && position.isEqual(lastHistoryPos)) return
        history.push([position, kind])
        onHistoryUpdate?.()
    }

    vscode.window.onDidChangeTextEditorSelection(({ kind, textEditor: editor, selections }) => {
        if (editor !== vscode.window.activeTextEditor || !editor.selection.start.isEqual(editor.selection.end)) return
        if (editor.document.uri.toString() !== currentUri) return
        if (dontWriteTillNextChange) {
            dontWriteTillNextChange = false
            return
        }

        // todo
        if (selections.length > 1) return
        lastPosition = editor.selection.active

        const last = history.at(-1)
        const pos = editor.selection.active
        let minorChange = false
        if (last) {
            if (last[1] === vscode.TextEditorSelectionChangeKind.Keyboard) return
            const lastPos = last[0]
            const lineDiff = Math.abs(pos.line - lastPos.line)
            const charDiff = Math.abs(pos.character - lastPos.character)
            if ((lineDiff === 1 && charDiff === 0) || (lineDiff === 0 && charDiff === 1)) {
                minorChange = true
                history.pop()
            }
        }

        const line = editor.document.lineAt(pos.line)
        const isLineStart = pos.character <= line.firstNonWhitespaceCharacterIndex
        const isLineEnd = pos.character === line.range.end.character
        const isFileStart = pos.line === 0 && pos.character === 0
        const isFileEnd = pos.line === editor.document.lineCount - 1 && isLineEnd

        const keyPosCandidate = isLineStart || isLineEnd || isFileStart || isFileEnd

        pushPosition(keyPosCandidate && last?.[1] === undefined ? undefined : kind)
    }, disposables)

    vscode.workspace.onDidChangeTextDocument(({ document }) => {
        if (document !== vscode.window.activeTextEditor?.document) return
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!history) return
        const [, lastKind] = history.at(-1) ?? []
        if (lastKind === 'text-change' || lastKind === vscode.TextEditorSelectionChangeKind.Keyboard) return
        pushPosition('text-change')
    }, disposables)

    changeHistory()
    pushPosition('editor-open')

    vscode.window.onDidChangeActiveTextEditor(() => {
        pushPosition('focus-out')
        changeHistory()
    }, disposables)

    registerExtensionCommand('showTrackedPositionsStack', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const { uri } = editor.document
        const history = historyPerEditor.get(uri.toString())
        if (!history) return
        const getItems = () =>
            history
                .map(
                    ([pos, kind], index): VSCodeQuickPickItem<vscode.Position> => ({
                        label: `${pos.line + 1}:${pos.character + 1}`,
                        description: typeof kind === 'string' || kind === undefined ? kind : vscode.TextEditorSelectionChangeKind[kind],
                        value: pos,
                    }),
                )
                .reverse()

        const currentPos = editor.selection.active
        const selected = await showQuickPick(getItems(), {
            title: 'Tracked Positions Stack',
            ignoreFocusOut: true,
            buttons: [
                {
                    // close button
                    iconPath: new vscode.ThemeIcon('close'),
                    tooltip: 'Close',
                },
            ],
            onDidTriggerButton() {
                // clear history
                history.splice(0, history.length)
                onHistoryUpdate?.()
                // void vscode.commands.executeCommand('workbench.action.closeQuickOpen')
            },
            onDidShow() {
                onHistoryUpdate = () => {
                    this.items = getItems()
                }
            },
            onDidChangeFirstActive(item) {
                dontWriteTillNextChange = true
                // const [selectedPos] = history[item.value]!
                const selectedPos = item.value
                editor.selection = new vscode.Selection(selectedPos, selectedPos)
                editor.revealRange(new vscode.Range(selectedPos, selectedPos))
            },
        })
        onHistoryUpdate = undefined
        if (selected === undefined) {
            editor.selection = new vscode.Selection(currentPos, currentPos)
            editor.revealRange(new vscode.Range(currentPos, currentPos))
            return
        }

        void vscode.window.showTextDocument(uri)
    })
    disposables.push(extensionCtx.subscriptions.at(-1)!)
    registerExtensionCommand('goToPreviousTrackedPosition', () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const { uri } = editor.document
        const history = historyPerEditor.get(uri.toString())
        if (!history) return
        const [selectedPos] = history.at(-2) ?? []
        history.pop()
        if (!selectedPos) return
        editor.selection = new vscode.Selection(selectedPos, selectedPos)
        editor.revealRange(new vscode.Range(selectedPos, selectedPos))
    })

    return disposables
}

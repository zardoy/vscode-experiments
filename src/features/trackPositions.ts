import * as vscode from 'vscode'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'
import { Settings, VSCodeQuickPickItem, extensionCtx, registerExtensionCommand } from 'vscode-framework'

export const enableIf: keyof Settings = 'trackDocumentPositions.enable'

export default () => {
    const disposables = [] as vscode.Disposable[]

    type OurKind = vscode.TextEditorSelectionChangeKind | 'focus-out' | 'text-change'

    type History = Array<[pos: vscode.Position, kind?: OurKind]>

    const historyPerEditor = new Map<vscode.Uri, History>()
    let history: History
    let onHistoryUpdate: (() => void) | undefined
    const changeHistory = () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const key = editor.document.uri
        history = historyPerEditor.get(key) ?? []
        historyPerEditor.set(key, history)
    }

    let writePositions = true

    const pushPosition = (kind?: OurKind, forceAdd = false) => {
        if (!writePositions) return
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const position = editor.selection.active
        const lastPos = history.at(-1)?.[0]
        if (!forceAdd && lastPos && position.isEqual(lastPos)) return
        history.push([position, kind])
        onHistoryUpdate?.()
    }

    vscode.window.onDidChangeTextEditorSelection(({ kind, textEditor: editor, selections }) => {
        if (editor !== vscode.window.activeTextEditor || !editor.selection.start.isEqual(editor.selection.end)) return
        // todo
        if (selections.length > 1) return
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

        pushPosition(keyPosCandidate && last?.[1] === undefined ? undefined : kind, true)
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
    pushPosition()

    vscode.window.onDidChangeActiveTextEditor(() => {
        pushPosition('focus-out')
        changeHistory()
    }, disposables)

    registerExtensionCommand('showTrackedPositionsStack', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const { uri } = editor.document
        const history = historyPerEditor.get(uri)
        if (!history) return
        const getItems = () =>
            history.map(
                ([pos, kind], index): VSCodeQuickPickItem<number> => ({
                    label: `${pos.line + 1}:${pos.character + 1}`,
                    description: typeof kind === 'string' || kind === undefined ? kind : vscode.TextEditorSelectionChangeKind[kind],
                    value: index,
                }),
            )

        const currentPos = editor.selection.active
        const index = await showQuickPick(getItems(), {
            title: 'Tracked Positions Stack',
            ignoreFocusOut: true,
            onDidShow() {
                onHistoryUpdate = () => {
                    this.items = getItems()
                }
            },
            onDidChangeFirstActive(item, index) {
                writePositions = false
                const [selectedPos] = history[index]!
                editor.selection = new vscode.Selection(selectedPos, selectedPos)
                editor.revealRange(new vscode.Range(selectedPos, selectedPos))
                setTimeout(() => {
                    writePositions = true
                })
            },
        })
        onHistoryUpdate = undefined
        if (index === undefined) {
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
        const history = historyPerEditor.get(uri)
        if (!history) return
        const [selectedPos] = history.at(-2) ?? []
        history.pop()
        if (!selectedPos) return
        editor.selection = new vscode.Selection(selectedPos, selectedPos)
        editor.revealRange(new vscode.Range(selectedPos, selectedPos))
    })

    return disposables
}

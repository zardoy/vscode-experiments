import { commands, Position, Range, Selection, SemanticTokens, SemanticTokensBuilder, SemanticTokensLegend, window } from 'vscode'

declare const trackDisposable

console.clear()
//@ts-ignore
console.show()
// todo: SemanticTokensBuilder
const doParsing = async () => {
    const { activeTextEditor } = window
    if (!activeTextEditor) return
    const { document } = activeTextEditor
    const tokensLegend: SemanticTokensLegend | undefined = await commands.executeCommand(
        'vscode.provideDocumentSemanticTokensLegend',
        activeTextEditor.document.uri,
    )
    const tokenTypesMap = new Map<number, string>()
    const tokenModifierMap = new Map<number, string>()
    if (!tokensLegend) return
    for (const [i, type] of tokensLegend.tokenTypes.entries()) {
        tokenTypesMap.set(i, type)
    }
    for (const [i, modifier] of tokensLegend.tokenModifiers.entries()) {
        tokenModifierMap.set(i, modifier)
    }
    // console.log(tokenModifierMap)
    const tokens: SemanticTokens | undefined = await commands.executeCommand('vscode.provideDocumentSemanticTokens', activeTextEditor.document.uri)
    // const tokensBuilder = new SemanticTokensBuilder()
    const locationsByToken = new Map<string, string[]>()
    if (!tokens) return
    const { data } = tokens
    for (const [i] of Array.from({ length: data.length / 5 }).entries()) {
        const tokenName = tokenTypesMap.get(data[i + 3])
        if (!tokenName) continue
        let names = locationsByToken.get(tokenName)
        names ??= locationsByToken.set(tokenName, []).get(tokenName)
        const startPos = new Position(data[i + 0], data[i + 1])
        const range = new Range(startPos, document.positionAt(document.offsetAt(startPos) + data[i + 2]))
        const text = document.getText(range)
        names?.push(text)
    }
    console.log(locationsByToken)
}
doParsing()
trackDisposable(commands.registerCommand('runActiveDevelopmentCommand', doParsing))

import * as vscode from 'vscode'

// Maximum file size in bytes to process (1MB)
const MAX_FILE_SIZE = 1024 * 1024

// Regex patterns for matching colors
const COLOR_PATTERNS = {
    hex: /#([\dA-Fa-f]{3}){1,2}\b/g,
    rgb: /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/g,
    rgba: /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)/g
}

function parseHexColor(hex: string): vscode.Color | undefined {
    hex = hex.slice(1) // Remove #
    let r = 0; let g = 0; let b = 0

    if (hex.length === 3) {
        r = Number.parseInt(hex[0]! + hex[0]!, 16) / 255
        g = Number.parseInt(hex[1]! + hex[1]!, 16) / 255
        b = Number.parseInt(hex[2]! + hex[2]!, 16) / 255
    } else if (hex.length === 6) {
        r = Number.parseInt(hex.slice(0, 2), 16) / 255
        g = Number.parseInt(hex.slice(2, 4), 16) / 255
        b = Number.parseInt(hex.slice(4, 6), 16) / 255
    } else {
        return undefined
    }

    return new vscode.Color(r, g, b, 1)
}

function parseRgbColor(match: string): vscode.Color | undefined {
    const values = match.match(/\d+/g)
    if (!values || values.length < 3) return undefined

    const rgbValues = values.slice(0, 3).map(v => {
        const parsed = Number.parseInt(v, 10)
        return Number.isNaN(parsed) ? undefined : parsed / 255
    })
    if (rgbValues.some(v => v === undefined || v < 0 || v > 1)) return undefined

    const alpha = values.length === 4 ? Number.parseFloat(values[3]!) : 1
    return new vscode.Color(rgbValues[0]!, rgbValues[1]!, rgbValues[2]!, alpha)
}

export default (): vscode.Disposable => vscode.languages.registerColorProvider(
        [
            { language: 'typescript' },
            { language: 'javascript' },
            { language: 'typescriptreact' },
            { language: 'javascriptreact' },
        ],
        {
            async provideDocumentColors(
                document: vscode.TextDocument,
                token: vscode.CancellationToken
            ): Promise<vscode.ColorInformation[]> {
                // Skip large files
                const textEncoder = new TextEncoder()
                const fileSize = textEncoder.encode(document.getText()).length
                if (fileSize > MAX_FILE_SIZE) {
                    return []
                }

                const text = document.getText()
                const colors: vscode.ColorInformation[] = []

                // Match hex colors
                let match = COLOR_PATTERNS.hex.exec(text)
                while (match !== null) {
                    const color = parseHexColor(match[0])
                    if (color) {
                        const range = new vscode.Range(
                            document.positionAt(match.index),
                            document.positionAt(match.index + match[0].length)
                        )
                        colors.push(new vscode.ColorInformation(range, color))
                    }

                    match = COLOR_PATTERNS.hex.exec(text)
                }

                // Match rgb/rgba colors
                const rgbPatterns = [COLOR_PATTERNS.rgb, COLOR_PATTERNS.rgba]
                for (const pattern of rgbPatterns) {
                    let rgbMatch = pattern.exec(text)
                    while (rgbMatch !== null) {
                        const color = parseRgbColor(rgbMatch[0])
                        if (color) {
                            const range = new vscode.Range(
                                document.positionAt(rgbMatch.index),
                                document.positionAt(rgbMatch.index + rgbMatch[0].length)
                            )
                            colors.push(new vscode.ColorInformation(range, color))
                        }

                        rgbMatch = pattern.exec(text)
                    }
                }

                return colors
            },

            provideColorPresentations(
                color: vscode.Color,
                context: { document: vscode.TextDocument, range: vscode.Range },
                token: vscode.CancellationToken
            ): vscode.ProviderResult<vscode.ColorPresentation[]> {
                const red = Math.round(color.red * 255)
                const green = Math.round(color.green * 255)
                const blue = Math.round(color.blue * 255)

                const hex = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`

                const presentations = [
                    new vscode.ColorPresentation(hex),
                    new vscode.ColorPresentation(`rgb(${red}, ${green}, ${blue})`)
                ]

                if (color.alpha !== 1) {
                    presentations.push(
                        new vscode.ColorPresentation(`rgba(${red}, ${green}, ${blue}, ${color.alpha.toFixed(2)})`)
                    )
                }

                return presentations
            }
        }
    )

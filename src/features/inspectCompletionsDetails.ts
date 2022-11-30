import * as vscode from 'vscode'
import _ from 'lodash'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'
import { remark } from 'remark'
import dedent from 'string-dedent'

export default () => {
    const prepareCompletionDetails = async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        let { items }: vscode.CompletionList = await vscode.commands.executeCommand(
            'vscode.executeCompletionItemProvider',
            editor.document.uri,
            editor.selection.active,
            undefined,
            getExtensionSetting('inspectCompletionsDetails.resolveItems'),
        )
        items = _.sortBy(items, ({ label, sortText = label }) => sortText)
        const includedKinds = Object.entries(_.countBy(items, ({ kind = vscode.CompletionItemKind.Property }) => vscode.CompletionItemKind[kind])).sort(
            ([, a], [, b]) => b - a,
        )
        type KindString = keyof typeof vscode.CompletionItemKind

        const selectedKinds = await showQuickPick(
            includedKinds.map(([kindName, count]) => ({
                label: `$(symbol-${kindName.toLowerCase()}) ${kindName}`,
                description: count.toString(),
                value: kindName as KindString,
            })),
            {
                title: 'Which completion kinds to include',
                canPickMany: true,
                // initialAllSelected: true,
                onDidShow() {
                    this.selectedItems = this.items.filter(item => item.value !== 'Snippet')
                },
            },
        )
        if (!selectedKinds) return
        type CompletionProp = keyof vscode.CompletionItem
        const includeDataSetting = getExtensionSetting('inspectCompletionsDetails.includeCompletionData') as CompletionProp[]
        const includeData =
            includeDataSetting.length > 0
                ? includeDataSetting
                : await showQuickPick(
                      (['detail', 'documentation', 'insertText'] as CompletionProp[]).map(prop => ({
                          label: prop,
                          value: prop,
                      })),
                      {
                          canPickMany: true,
                          onDidShow() {
                              this.selectedItems = this.items.filter(({ value }) => value !== 'insertText')
                          },
                      },
                  )
        if (!includeData) return
        return {
            includeData,
            items: items.filter(({ kind = vscode.CompletionItemKind.Property }) => selectedKinds.includes(vscode.CompletionItemKind[kind]! as KindString)),
        }
    }

    const inspectCompletionsDetailsShared = async (format: 'markdown' | 'simpleMarkdown', sep = ' ') => {
        const data = await prepareCompletionDetails()
        if (!data) return
        const { document } = vscode.window.activeTextEditor!
        const { includeData, items } = data
        const processMarkdown = (content: string): string => {
            const prefixLinkRemove = vscode.workspace.workspaceFolders?.[0]?.uri.toString()
            return remark()
                .use(() => rootNode => {
                    const processChild = (child: typeof rootNode['children'][number]) => {
                        // link references are not used in documentation
                        if (child.type === 'link' && prefixLinkRemove && child.url.startsWith(prefixLinkRemove))
                            // file:///Users/vitaly/Documents/vscode-fig-unreleased
                            child.url = child.url.slice(prefixLinkRemove.length)

                        // for @example blocks
                        if (child.type === 'code' && !child.lang /*  && !content.slice(child.position!.start.offset).startsWith('```') */)
                            child.lang = document.languageId

                        // eslint-disable-next-line unicorn/no-array-for-each
                        if ('children' in child) child.children.forEach(processChild)
                    }

                    processChild(rootNode as any)
                    return rootNode
                })
                .processSync(content)
                .toString()
        }

        const getItemRow = ({ label, ...rest }: vscode.CompletionItem): string[] => {
            const labelString = typeof label === 'object' ? label.label : label
            return [
                format === 'markdown' ? `<code>${labelString}</code>` : `## ${labelString}\n\n`,
                ...includeData.map(prop => {
                    if (!rest[prop]) return ''
                    const renderMd = true /* format === 'markdown' */

                    switch (prop) {
                        case 'documentation': {
                            if (typeof rest.documentation !== 'object') return rest.documentation!
                            return renderMd ? processMarkdown(rest.documentation.value) : rest.documentation.value
                        }

                        case 'detail':
                            return renderMd ? `\nDetail:\n\`\`\`${document.languageId}\n${rest.detail!}\n\`\`\`\n` : rest.detail!

                        default:
                            return String(rest[prop])
                    }
                }),
            ]
        }

        const headerItems = ['label', ...includeData]
        const content =
            format === 'markdown'
                ? dedent`
                  <table>
                  <tr>
                  ${headerItems.map(header => `<td> <b>${header}</b> </td>`).join(' ')}
                  </tr>
                  ${items
                      .map(
                          item => `<tr>${getItemRow(item)
                              .map(x => `<td>\n\n${x}\n\n</td>`)
                              .join(' ')}
                    </tr>`,
                      )
                      .join('\n')}
                  </table>
                `
                : `${headerItems.join(sep)}\n${items.map(item => getItemRow(item).join(sep)).join('\n')}`
        return {
            document: await vscode.workspace.openTextDocument({
                content,
                language: 'markdown',
            }),
            openView: getExtensionSetting('inspectCompletionsDetails.openLocation'),
        }
    }

    registerExtensionCommand('inspectCompletionsDetails', async () => {
        const data = await inspectCompletionsDetailsShared('markdown')
        if (!data) return
        const { document, openView } = data
        // TODO resolve sebsequent opening bug
        // await vscode.window.showTextDocument(document, { viewColumn: openView === 'toSide' ? vscode.ViewColumn.Beside : undefined })
        await vscode.commands.executeCommand(openView === 'newTab' ? 'markdown.showPreview' : 'markdown.showPreviewToSide', document.uri)
    })
    registerExtensionCommand('inspectCompletionsDetailsRaw', async (_, { separator, language }: { separator?: string; language?: string } = {}) => {
        const data = await inspectCompletionsDetailsShared('simpleMarkdown', separator)
        if (!data) return
        const { document, openView } = data
        if (language) await vscode.languages.setTextDocumentLanguage(document, language)
        await vscode.window.showTextDocument(document, { viewColumn: openView === 'toSide' ? vscode.ViewColumn.Beside : undefined })
    })
}

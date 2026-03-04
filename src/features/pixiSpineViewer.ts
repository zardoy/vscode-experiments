/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand, type Settings } from 'vscode-framework'
import { noWebSupported } from '../util'
import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'

const TEXTURES_RELATIVE = 'src/shared/assets/textures.json'
const VIEWER_BASE = 'https://pixi-spine-viewer.vercel.app'

interface SpineEntryConfig {
    path: string
    x?: number
    y?: number
    scale?: number
    forcePrepare?: boolean
    [key: string]: unknown
}

interface TexturesJson {
    spinePaths?: Record<string, SpineEntryConfig>
}

interface SpineMapItem {
    name: string
    path: string
    json: string
    atlas: string
    png: string
    [key: string]: string | number | boolean | undefined
}

export const enableIf: keyof Settings = 'features.pixiSpineViewer'

function getTexturesPath(workspaceRoot: vscode.WorkspaceFolder): string {
    return path.join(workspaceRoot.uri.fsPath, TEXTURES_RELATIVE)
}

function readTexturesJson(texturesPath: string): TexturesJson | null {
    try {
        const raw = fs.readFileSync(texturesPath, 'utf-8')
        return JSON.parse(raw) as TexturesJson
    } catch {
        return null
    }
}

function scanSpineDir(spineDir: string): { json: string; atlas: string; images: string[] } | null {
    if (!fs.existsSync(spineDir) || !fs.statSync(spineDir).isDirectory()) return null
    const files = fs.readdirSync(spineDir)
    let skeletonFile: string | undefined
    let atlasFile: string | undefined
    const imageFiles: string[] = []
    const imageExt = /\.(png|jpg|jpeg|webp)$/i
    for (const f of files) {
        const lower = f.toLowerCase()
        if (lower.endsWith('.skel')) skeletonFile = f
        else if (lower.endsWith('.json') && !skeletonFile) skeletonFile = f
        else if (lower.endsWith('.atlas')) atlasFile = f
        else if (imageExt.test(f)) imageFiles.push(f)
    }
    if (!skeletonFile || !atlasFile || imageFiles.length === 0) return null
    return { json: skeletonFile, atlas: atlasFile, images: imageFiles }
}

function buildSpinesMap(
    texturesPath: string,
    textures: TexturesJson,
    baseUrl: string,
): { items: SpineMapItem[]; allowedFiles: Map<string, Set<string>> } {
    const baseDir = path.dirname(texturesPath)
    const items: SpineMapItem[] = []
    const allowedFiles = new Map<string, Set<string>>()
    const spinePaths = textures.spinePaths ?? {}
    for (const [name, config] of Object.entries(spinePaths)) {
        const relPath = config.path ?? ''
        const spineDir = path.normalize(path.join(baseDir, relPath))
        const scanned = scanSpineDir(spineDir)
        if (!scanned) continue
        const allowed = new Set<string>([scanned.json, scanned.atlas, ...scanned.images])
        allowedFiles.set(name, allowed)
        const assetBase = `${baseUrl}/asset/${encodeURIComponent(name)}/`
        const entry: SpineMapItem = {
            name,
            path: relPath,
            json: assetBase + encodeURIComponent(scanned.json),
            atlas: assetBase + encodeURIComponent(scanned.atlas),
            png: assetBase + encodeURIComponent(scanned.images[0]!),
            ...config,
        }
        scanned.images.forEach((img, i) => {
            const key = i === 0 ? 'png' : `png${i + 1}`
            ;(entry as Record<string, string>)[key] = assetBase + encodeURIComponent(img)
        })
        items.push(entry)
    }
    return { items, allowedFiles }
}

const ALLOWED_UPDATE_KEYS = new Set(['x', 'y', 'scale', 'forcePrepare'])

function createServer(
    texturesPath: string,
    textures: TexturesJson,
    allowedFiles: Map<string, Set<string>>,
    baseDir: string,
    spinePaths: Record<string, SpineEntryConfig>,
): http.Server {
    return http.createServer((req, res) => {
        const cors = () => {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        }
        if (req.method === 'OPTIONS') {
            cors()
            res.writeHead(204)
            res.end()
            return
        }
        cors()

        const url = req.url ?? '/'
        const [pathname, qs] = url.split('?')

        if (req.method === 'GET' && pathname === '/spines-map') {
            //@ts-ignore
            const addr = (req.socket?.server as http.Server)?.address()
            const port = addr && typeof addr === 'object' && 'port' in addr ? addr.port : ''
            const baseUrl = `http://127.0.0.1:${port}`
            const { items } = buildSpinesMap(texturesPath, textures, baseUrl)
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(200)
            res.end(JSON.stringify(items))
            return
        }

        if (req.method === 'GET' && pathname && pathname.startsWith('/asset/')) {
            const rest = pathname.slice('/asset/'.length)
            const slash = rest.indexOf('/')
            if (slash === -1) {
                res.writeHead(400)
                res.end()
                return
            }
            const key = decodeURIComponent(rest.slice(0, slash))
            const filename = decodeURIComponent(rest.slice(slash + 1))
            if (!key || !filename || filename.includes('..')) {
                res.writeHead(400)
                res.end()
                return
            }
            const allowed = allowedFiles.get(key)
            if (!allowed || !allowed.has(filename)) {
                res.writeHead(404)
                res.end()
                return
            }
            const spineConfig = spinePaths[key]
            if (!spineConfig?.path) {
                res.writeHead(404)
                res.end()
                return
            }
            const spineDir = path.normalize(path.join(baseDir, spineConfig.path))
            const filePath = path.join(spineDir, filename)
            if (!filePath.startsWith(spineDir) || !fs.existsSync(filePath)) {
                res.writeHead(404)
                res.end()
                return
            }
            const ext = path.extname(filename).toLowerCase()
            const mime =
                ext === '.json'
                    ? 'application/json'
                    : ext === '.atlas'
                      ? 'text/plain'
                      : ext === '.png'
                        ? 'image/png'
                        : ext === '.jpg' || ext === '.jpeg'
                          ? 'image/jpeg'
                          : ext === '.webp'
                            ? 'image/webp'
                            : 'application/octet-stream'
            res.setHeader('Content-Type', mime)
            res.writeHead(200)
            fs.createReadStream(filePath).pipe(res)
            return
        }

        if (req.method === 'POST' && pathname === '/update-spine') {
            let body = ''
            req.on('data', chunk => {
                body += chunk
            })
            req.on('end', () => {
                try {
                    const data = JSON.parse(body) as { key: string; [key: string]: unknown }
                    const { key, ...updates } = data
                    if (!key || typeof key !== 'string' || !spinePaths[key]) {
                        res.writeHead(400)
                        res.end(JSON.stringify({ error: 'Unknown spine key' }))
                        return
                    }
                    const filtered: Record<string, unknown> = {}
                    for (const k of Object.keys(updates)) {
                        if (ALLOWED_UPDATE_KEYS.has(k)) filtered[k] = updates[k]
                    }
                    Object.assign(spinePaths[key], filtered)
                    fs.writeFileSync(texturesPath, JSON.stringify(textures, null, 2), 'utf-8')
                    res.setHeader('Content-Type', 'application/json')
                    res.writeHead(200)
                    res.end(JSON.stringify({ ok: true }))
                } catch {
                    res.writeHead(400)
                    res.end(JSON.stringify({ error: 'Invalid request' }))
                }
            })
            return
        }

        res.writeHead(404)
        res.end()
    })
}

export default () => {
    if (!getExtensionSetting('features.pixiSpineViewer')) return

    registerExtensionCommand('openPixiSpineViewer', async () => {
        if (process.env.PLATFORM === 'web') {
            noWebSupported()
            return
        }
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]
        if (!workspaceRoot) {
            void vscode.window.showWarningMessage('No workspace folder open.')
            return
        }
        const texturesPath = getTexturesPath(workspaceRoot)
        if (!fs.existsSync(texturesPath)) {
            void vscode.window.showWarningMessage(`Missing ${TEXTURES_RELATIVE}`)
            return
        }
        const textures = readTexturesJson(texturesPath)
        if (!textures?.spinePaths || Object.keys(textures.spinePaths).length === 0) {
            void vscode.window.showWarningMessage('No spinePaths in textures.json')
            return
        }
        const baseDir = path.dirname(texturesPath)
        const { items, allowedFiles } = buildSpinesMap(texturesPath, textures, 'http://localhost:0')
        if (items.length === 0) {
            void vscode.window.showWarningMessage('No valid spine directories found (need .skel/.json, .atlas, and images)')
            return
        }

        const server = createServer(
            texturesPath,
            textures,
            allowedFiles,
            baseDir,
            textures.spinePaths!,
        )
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address()
            const port = addr && typeof addr === 'object' ? addr.port : 0
            const baseUrl = `http://127.0.0.1:${port}`
            const spinesMapUrl = `${baseUrl}/spines-map`
            const viewerUrl = `${VIEWER_BASE}/?spinesMap=${encodeURIComponent(spinesMapUrl)}`
            void vscode.env.openExternal(vscode.Uri.parse(viewerUrl))
        })
    })
}

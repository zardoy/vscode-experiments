//@ts-check
const { defineConfig } = require('@zardoy/vscode-utils/build/defineConfig.cjs')

module.exports = defineConfig({
    development: {
        disableExtensions: false,
    },
    target: { desktop: true, web: true },
    esbuild: {
        platform: 'node',
        plugins: [
            {
                name: 'all-features-index',
                setup(build) {
                    const webBuild = !!build.initialOptions.outfile?.endsWith('extension-web.js')
                    const skipWebFeatures = ['inspectCompletionsDetails']

                    const namespace = 'all-features-index'
                    const fs = require('fs')
                    const featuresDir = './src/features/'
                    build.onResolve({ filter: /^all-features-index$/ }, args => {
                        return {
                            path: args.path,
                            watchDirs: [featuresDir],
                            namespace,
                        }
                    })
                    build.onLoad({ filter: /.*/, namespace }, args => {
                        const files = fs.readdirSync(featuresDir)
                        let contents = ''
                        for (const file of files) {
                            if (file.endsWith('.ts')) {
                                const fileName = file.replace('.ts', '')
                                if (file === 'index.ts' || (webBuild && skipWebFeatures.includes(fileName))) continue
                                contents += `export * as ${fileName} from './${fileName}'\n`
                            }
                        }
                        return {
                            contents,
                            resolveDir: featuresDir,
                            loader: 'ts',
                        }
                    })
                },
            },
        ],
    },
})

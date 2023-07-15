//@ts-check
const { defineConfig } = require('@zardoy/vscode-utils/build/defineConfig.cjs')

module.exports = defineConfig({
    development: {
        disableExtensions: false,
    },
    target: { desktop: true, web: true },
    esbuild: {
        plugins: [
            {
                name: 'all-features-index',
                setup(build) {
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
                            if (file === 'index.ts') continue
                            if (file.endsWith('.ts')) {
                                const fileName = file.replace('.ts', '')
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

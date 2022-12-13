//@ts-check
const { defineConfig } = require('@zardoy/vscode-utils/build/defineConfig.cjs')

module.exports = defineConfig({
    development: {
        disableExtensions: false,
    },
    target: { desktop: true, web: true },
    // esbuild: {
    //     plugins: {
    //         // @ts-ignore
    //         plugins: [
    //             {
    //                 name: 'web-fix',
    //                 setup(build) {
    //                     build.onResolve({ filter: /decode-named-character-reference/ }, () => {
    //                         return {
    //                             namespace: 'OVERRIDE_MODULE',
    //                             path: 'OVERRIDE_MODULE',
    //                         }
    //                     })
    //                     build.onLoad({ filter: /.*/, namespace: 'OVERRIDE_MODULE' }, () => {
    //                         return {
    //                             contents: `
    //                         import {characterEntities} from 'character-entities'

    //                         export function decodeNamedCharacterReference(value) {
    //                             return own.call(characterEntities, value) ? characterEntities[value] : false
    //                           }
    //                           `,
    //                             loader: 'ts',
    //                             resolveDir: '.',
    //                         }
    //                     })
    //                 },
    //             },
    //         ],
    //     },
    // },
})

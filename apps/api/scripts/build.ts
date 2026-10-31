// Bundles each entry point into one file with its dependencies inlined, so the production image needs
// no node_modules: the Dockerfile copies dist/ and drizzle/ and nothing else. It also inlines
// packages/shared, which has no build of its own (its main points at src/index.ts).
//
// Do not pass `packages: "external"`: it externalizes any import resolved through node_modules,
// including workspace packages (which are only symlinks there), and @rinia/shared would then be
// missing at runtime.
//
// The target is "node" even though production runs on Bun: the output runs on both runtimes, so
// going back to Node only means changing the base image and CMD in the Dockerfile.
const entryPoints = ["src/server.ts", "src/db/migrate.ts"];

for (const entryPoint of entryPoints) {
    // One build per entry point keeps every output at the top of dist/ (dist/server.js, dist/migrate.js).
    const result = await Bun.build({
        entrypoints: [entryPoint],
        outdir: "dist",
        target: "node",
        minify: true,
        sourcemap: "linked",
    });

    if (!result.success) {
        for (const log of result.logs) console.error(log);
        process.exit(1);
    }

    for (const output of result.outputs) {
        console.log(`  ${output.path.replace(`${process.cwd()}/`, "")}  ${(output.size / 1024).toFixed(1)} KB`);
    }
}

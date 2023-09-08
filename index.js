/* eslint-disable max-len */
const transformFiles = require('./transform-files');
const { readFile } = require('node:fs/promises');
const { glob } = require('glob');
const { sources, Compilation } = require('webpack');

const plugin = { name: 'MergeIntoFile' };

class MergeIntoFile {
  constructor(options, onComplete) {
    this.options = options;
    this.onComplete = onComplete;
  }

  apply(compiler) {
    let emitHookSet = false;
    compiler.hooks.thisCompilation.tap(
      plugin.name,
      (compilation) => {
        if (compilation.hooks.processAssets) {
          compilation.hooks.processAssets.tapAsync(
            {
              name: plugin.name,
              stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            },
            (_, callback) => this.run(compiler, compilation, callback),
          );
        } else if (!emitHookSet) {
          emitHookSet = true;
          compiler.hooks.emit
            .tapAsync(plugin.name, (compilationObj) => this.run(compiler, compilationObj));
        }
      },
    );
  }

  run(compiler, compilation, callback) {
    const transformerOptions = {
      glob,
      readFile,
      options: this.options,
      compiler,
      compilation,
      sources,
      callback,
      onComplete: this.onComplete,
    }
    transformFiles(transformerOptions);
  }
}

module.exports = MergeIntoFile;

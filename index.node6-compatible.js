"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

/* eslint-disable max-len */
var transformFiles = require('./transform-files');

var _require = require('node:fs/promises'),
    readFile = _require.readFile;

var _require2 = require('glob'),
    glob = _require2.glob;

var _require3 = require('webpack'),
    sources = _require3.sources,
    Compilation = _require3.Compilation;

var plugin = {
  name: 'MergeIntoFile'
};

var MergeIntoFile = /*#__PURE__*/function () {
  function MergeIntoFile(options, onComplete) {
    (0, _classCallCheck2["default"])(this, MergeIntoFile);
    this.options = options;
    this.onComplete = onComplete;
  }

  (0, _createClass2["default"])(MergeIntoFile, [{
    key: "apply",
    value: function apply(compiler) {
      var _this = this;

      var emitHookSet = false;
      compiler.hooks.thisCompilation.tap(plugin.name, function (compilation) {
        if (compilation.hooks.processAssets) {
          compilation.hooks.processAssets.tapAsync({
            name: plugin.name,
            stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
          }, function (_, callback) {
            return _this.run(compiler, compilation, callback);
          });
        } else if (!emitHookSet) {
          emitHookSet = true;
          compiler.hooks.emit.tapAsync(plugin.name, function (compilationObj) {
            return _this.run(compiler, compilationObj);
          });
        }
      });
    }
  }, {
    key: "run",
    value: function run(compiler, compilation, callback) {
      var transformerOptions = {
        glob: glob,
        readFile: readFile,
        options: this.options,
        compiler: compiler,
        compilation: compilation,
        sources: sources,
        callback: callback,
        onComplete: this.onComplete
      };
      transformFiles(transformerOptions);
    }
  }]);
  return MergeIntoFile;
}();

module.exports = MergeIntoFile;


const joinContent = async (promises, separator) => promises
  .reduce(async (acc, curr) => `${await acc}${(await acc).length ? separator : ''}${await curr}`, Promise.resolve(''));

const getContentHash = (compiler, compilation, source) => {
  const { outputOptions = {} } = compilation;
  const {
    hashDigest, hashDigestLength, hashFunction, hashSalt,
  } = outputOptions;
  const hash = compiler.webpack.util.createHash(hashFunction);

  if (hashSalt) {
    hash.update(hashSalt);
  }
  hash.update(source);

  const fullContentHash = hash.digest(hashDigest);
  return fullContentHash.slice(0, hashDigestLength);
};

const transformFiles = (transformerOptions) => {
  const {
    options,
    compilation,
    callback,
    glob,
    readFile,
    compiler,
    sources,
    onComplete,
  } = transformerOptions;
  let generatedFiles = {};
  const {
    files,
    transform,
    chunks,
  } = options;
  if (chunks && compilation.chunks && compilation.chunks
    .filter((chunk) => chunks.indexOf(chunk.name) >= 0 && chunk.rendered).length === 0) {
    if (typeof (callback) === 'function') {
      callback();
    }
    return;
  }
  let filesCanonical = [];
  if (!Array.isArray(files)) {
    Object.keys(files).forEach((newFile) => {
      filesCanonical.push({
        src: files[newFile],
        dest: newFile,
      });
    });
  } else {
    filesCanonical = files;
  }

  filesCanonical.forEach((fileTransform) => {
    if (typeof fileTransform.dest === 'string') {
      const destFileName = fileTransform.dest;
      fileTransform.dest = async (code) => { // eslint-disable-line no-param-reassign
        const transformedCode = (transform && transform[destFileName])
          ? transform[destFileName](code)
          : code;
        return {
          [destFileName]: transformedCode instanceof Promise
            ? await transformedCode : transformedCode,
        };
      };
    }
  });
  const {
    encoding = 'utf-8',
    hash,
    transformFileName,
    separator = '\n',
  } = options;
  const finalPromises = filesCanonical.map(async (fileTransform) => {
    
    const listOfLists = await Promise.all(fileTransform.src.map((path) => glob(path)));
    const flattenedList = Array.prototype.concat.apply([], listOfLists);
    const filesContentPromises = flattenedList.map((path) => readFile(path, encoding));
    const content = await joinContent(filesContentPromises, separator);

    const resultsFiles = await fileTransform.dest(content);
    // eslint-disable-next-line no-restricted-syntax
    for (const resultsFile in resultsFiles) {
      if (typeof resultsFiles[resultsFile] === 'object') {
        // eslint-disable-next-line no-await-in-loop
        resultsFiles[resultsFile] = await resultsFiles[resultsFile];
      }
    }
    Object.keys(resultsFiles).forEach((newFileName) => {
      let newFileNameHashed = newFileName;
      const hasTransformFileNameFn = typeof transformFileName === 'function';

      if (hash || hasTransformFileNameFn) {
        const hashPart = getContentHash(compiler, compilation, resultsFiles[newFileName]);

        if (hasTransformFileNameFn) {
          const extensionPattern = /\.[^.]*$/g;
          const fileNameBase = newFileName.replace(extensionPattern, '');
          const [extension] = newFileName.match(extensionPattern);

          newFileNameHashed = transformFileName(fileNameBase, extension, hashPart);
        } else {
          newFileNameHashed = newFileName.replace(/(\.min)?\.\w+(\.map)?$/, (suffix) => `-${hashPart}${suffix}`);
        }

        const fileId = newFileName.replace(/\.map$/, '').replace(/\.\w+$/, '');

        if (typeof compilation.addChunk === 'function') {
          const chunk = compilation.addChunk(fileId);
          chunk.id = fileId;
          chunk.ids = [chunk.id];
          if (chunk.files instanceof Set) {
            chunk.files.add(newFileNameHashed);
          } else {
            chunk.files.push(newFileNameHashed);
          }
        }
      }
      generatedFiles[newFileName] = newFileNameHashed;

      let rawSource;
      if (sources && sources.RawSource) {
        rawSource = new sources.RawSource(resultsFiles[newFileName]);
      } else {
        rawSource = {
          source() {
            return resultsFiles[newFileName];
          },
          size() {
            return resultsFiles[newFileName].length;
          },
        };
      }

      if (compilation.emitAsset) {
        compilation.emitAsset(newFileNameHashed, rawSource);
      } else {
        // eslint-disable-next-line no-param-reassign
        compilation.assets[newFileNameHashed] = rawSource;
      }
    });
  });

  Promise.all(finalPromises)
    .then(() => {
      if (onComplete) {
        onComplete(generatedFiles);
      }
      if (typeof (callback) === 'function') {
        callback();
      }
    })
    .catch((error) => {
      if (typeof (callback) === 'function') {
        callback(error);
      } else {
        throw new Error(error);
      }
    });
}

module.exports = transformFiles;
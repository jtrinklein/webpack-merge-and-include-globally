const transformFiles = require('./transform-files.js');

describe('transformFiles', () => {
  const pathToFiles = {
    'file1.js': ['1.js'],
    'file2.js': ['2.js'],
    '*.css': ['3.css', '4.css'],
  };

  const fileToContent = {
    '1.js': 'FILE_1_TEXT',
    '2.js': 'FILE_2_TEXT',
    '3.css': 'FILE_3_TEXT',
    '4.css': 'FILE_4_TEXT',
  };

  const getTransformerOptions = (overrides) => {
    return ({
      readFile: jest.fn((fileName) => Promise.resolve(fileToContent[fileName])),
      glob: jest.fn((path) => Promise.resolve(pathToFiles[path])),
      compiler: {
        webpack: {
          util: {
            createHash: () => ({
              update: jest.fn(),
              digest: jest.fn(() => '#filehash#'),
            }),
          }
        }
      },
      compilation: {
        assets: {}
      },
      ...overrides,
    })
  };

  it('should succeed merging using mock content', (done) => {
    const options = {
      files: {
        'script.js': [
          'file1.js',
          'file2.js',
        ],
        'style.css': [
          '*.css',
        ],
      },
    };

    const transformerOptions = getTransformerOptions({
      options,
      callback: (err) => {
        expect(err).toEqual(undefined);
        expect(transformerOptions.compilation.assets['script.js'].source()).toEqual('FILE_1_TEXT\nFILE_2_TEXT');
        expect(transformerOptions.compilation.assets['style.css'].source()).toEqual('FILE_3_TEXT\nFILE_4_TEXT');
        done();
      },
    });
    transformFiles(transformerOptions);
  });

  it('should succeed merging using mock content with a custom separator', (done) => {
    const options = {
      separator: '\n;\n',
      files: {
        'script.js': [
          'file1.js',
          'file2.js',
        ],
      },
    };
    
    const transformerOptions = getTransformerOptions({
      options,
      callback: (err) => {
        expect(err).toEqual(undefined);
        expect(transformerOptions.compilation.assets['script.js'].source()).toEqual('FILE_1_TEXT\n;\nFILE_2_TEXT');
        done();
      },
    });
    transformFiles(transformerOptions);

  });

  it('should succeed merging using mock content with transform', (done) => {
    const options = {
      files: {
        'script.js': [
          'file1.js',
          'file2.js',
        ],
        'style.css': [
          '*.css',
        ],
      },
      transform: {
        'script.js': (val) => `${val.toLowerCase()}`,
      },
    };
    
    const transformerOptions = getTransformerOptions({
      options,
      callback: (err) => {
        expect(err).toEqual(undefined);
        expect(transformerOptions.compilation.assets['style.css'].source()).toEqual('FILE_3_TEXT\nFILE_4_TEXT');
        done();
      },
    });
    transformFiles(transformerOptions);
  });

  it('should succeed merging using mock content with async transform', (done) => {

    const options = {
      files: {
        'script.js': [
          'file1.js',
          'file2.js',
        ],
        'style.css': [
          '*.css',
        ],
      },
      transform: {
        'script.js': async (val) => `${val.toLowerCase()}`,
      },
    };
    
    const transformerOptions = getTransformerOptions({
      options,
      callback: (err) => {
        expect(err).toEqual(undefined);
        expect(transformerOptions.compilation.assets['script.js'].source()).toEqual('file_1_text\nfile_2_text');
        expect(transformerOptions.compilation.assets['style.css'].source()).toEqual('FILE_3_TEXT\nFILE_4_TEXT');
        done();
      },
    });
    transformFiles(transformerOptions);
  });

  it('should succeed merging using mock content by using array instead of object', (done) => {
    const options = {
      files: [
        {
          src: ['file1.js', 'file2.js'],
          dest: (val) => ({
            'script.js': `${val.toLowerCase()}`,
          }),
        },
        {
          src: ['*.css'],
          dest: 'style.css',
        },
      ],
    };
    
    const transformerOptions = getTransformerOptions({
      options,
      callback: (err) => {
        expect(err).toEqual(undefined);
        expect(transformerOptions.compilation.assets['script.js'].source()).toEqual('file_1_text\nfile_2_text');
        expect(transformerOptions.compilation.assets['style.css'].source()).toEqual('FILE_3_TEXT\nFILE_4_TEXT');
        done();
      },
    });
    transformFiles(transformerOptions);
  });

  it('should succeed merging using transform file name function', (done) => {
    const mockHash = 'xyz';
    const options = {
      files: {
        'script.js': [
          'file1.js',
          'file2.js',
        ],
        'other.deps.js': [
          'file1.js',
        ],
        'style.css': [
          '*.css',
        ],
      },
      transformFileName: (fileNameBase, extension) => `${fileNameBase}${extension}?hash=${mockHash}`,
    };
    
    const transformerOptions = getTransformerOptions({
      options,
      callback: (err) => {
        expect(err).toEqual(undefined);
        expect(transformerOptions.compilation.assets[`script.js?hash=${mockHash}`]).toBeDefined();
        expect(transformerOptions.compilation.assets[`other.deps.js?hash=${mockHash}`]).toBeDefined();
        expect(transformerOptions.compilation.assets[`style.css?hash=${mockHash}`]).toBeDefined();
        done();
      },
    });
    transformFiles(transformerOptions);
  });
});

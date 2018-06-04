const checksum = require('checksum');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const request = require('request');
const url = require('url');
const zip = require('cross-zip');

const config = {
  expectedChecksum: '',
  source: '',
  gitRsFile: '',
  vendorDirectory: path.join(process.cwd(), 'vendor')
};

switch(process.platform){
  case 'win32':
    config.expectedChecksum = 'f4039505b0c4a7de3dd5494c79df60187888a2ee76882a153f21e237928a85fb';
    config.source = url.parse(
      'https://github.com/Axosoft/git-rs/releases/download/0.1.1/x86_64-pc-windows-msvc.zip'
    );
    config.gitRsFile = 'x86_64-pc-windows-msvc';
    break;
  case 'linux':
    config.expectedChecksum = '43d29654621fd4222ad22bb49fe0bec203463de5dbef4895637cc5782fdfa83b';
    config.source = url.parse(
      'https://github.com/Axosoft/git-rs/releases/download/0.1.1/x86_64-unknown-linux-gnu.zip'
    );
    config.gitRsFile = 'x86_64-unknown-linux-gnu';
    break;
  case 'darwin':
    config.expectedChecksum = 'a74dfbb53af0c72eea7a751fb928d0bd1ad37f6ae22fc7bc813f17d62df04fdd';
    config.source = url.parse(
      'https://github.com/Axosoft/git-rs/releases/download/0.1.1/x86_64-apple-darwin.zip'
    );
    config.gitRsFile = 'x86_64-apple-darwin';
    break;
}

const getFileChecksum = (filePath) => new Promise((resolve) => {
  checksum.file(filePath, { algorithm: 'sha256' } , (_, hash) => resolve(hash));
});

const setupGitRs = (config) => {
  new Promise( (resolve, reject) => {
    const req = request.get({ url: config.source });
    req.pipe(fs.createWriteStream(config.gitRsFile));

    req.on('error', () => {
      reject(Error('Failed to fetch gitrs'));
    });

    req.on('response', (res) => {
      if (res.statusCode !== 200) {
        reject(Error('Non-200 response returned from ${config.source.toString()} - (${res.statusCode})'));
      }
    });

    req.on('end', () => resolve());
  })
    .then(() => getFileChecksum(config.gitRsFile, config))
    .then((checksum) => {
      if (checksum != config.expectedChecksum) {
        return Promise.reject(Error('Checksum validation failed'));
      }
      return Promise.resolve();
    })
    .then(() => {
      return new Promise((resolve, reject) => mkdirp(
        config.vendorDirectory,
        (error) => error ? reject(new Error('Could not create vendor directory')) : resolve()
      ));
    })
    .then(() => {
      return new Promise((resolve, reject) =>
        zip.unzip(
          path.join(__dirname, '..', config.gitRsFile),
          config.vendorDirectory,
          error => error ? reject(new Error('Could not unzip gitRs archive')) : resolve()
        )
      );
    })
    .then(() => {
      return new Promise((resolve, reject) => fs.unlink(
        path.join(__dirname, '..', config.gitRsFile),
        (error) => error ? reject('Could not delete git-rs zip file') : resolve()
      ));
    })
    .catch((error) => {
      console.log(error); // eslint-disable-line no-console
    });
};

setupGitRs(config);

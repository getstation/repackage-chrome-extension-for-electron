const fs = require('fs-extra');
const Promise = require('bluebird');
const path = require('path');

const CSS_INJECTOR = `
// used to inject CSS
const runContentScriptsCSS = function (css) {
  var node = document.createElement('style');
  node.innerHTML = css;;
  window.document.body.appendChild(node);
}
`

const repackage = (extensionDir, targetDirectory) => {
  fs.ensureDirSync(targetDirectory);
  fs.emptyDirSync(targetDirectory);
  console.log(targetDirectory)
  fs.copySync(extensionDir, targetDirectory);

  reworkContentScripts(targetDirectory);
}

const reworkContentScripts = targetDirectory => {
  const manifest = readManifestSync(targetDirectory);
  if(!manifest.content_scripts) return;

  const newContentScripts = manifest.content_scripts.map((content_scripts, index) => {
    let content = '';

    // 1 - we concatenate JS together
    if (content_scripts.js) {
      content += readAndConcatenateJs(content_scripts.js, targetDirectory);
    }

    // 2 - we inject CSS via a JS commmand
    if (content_scripts.css) {
      content += CSS_INJECTOR + '\n';
      content += readAndConcatenateAndInjectCSS(content_scripts.css, targetDirectory);
      delete content_scripts.css;
    }

    // 3 - we work around a bug in the `content_scripts.matches`
    // interpretation of Electon
    if(content_scripts.matches) {
      content_scripts.matches = [ '('+content_scripts.matches.join('|')+')' ];
    }

    // 4 - gather all that in a single content_script
    const contentPath = `/content_script-${index}.js`;
    fs.writeFileSync(path.join(targetDirectory, contentPath), content);
    content_scripts.js = [contentPath];

    return content_scripts;
  });

  manifest.content_scripts = newContentScripts;
  writeManifestSync(targetDirectory, manifest);
}

const readAndConcatenateJs = (js, baseDir) => js.map(script => {
    const jsPath = path.join(baseDir, script);
    return `// ${script}\n` + fs.readFileSync(jsPath, 'utf8');
  })
  .join('\n');

const readAndConcatenateAndInjectCSS = (css, baseDir) => css.map(cssFile => {
    const cssPath = path.join(baseDir, cssFile);
    let cssCode = fs.readFileSync(cssPath, 'utf8');
    cssCode = cssCode.replace(/[\n\r]/g, '\\n').replace(/'/g, "\\'");
    return `// ${cssFile}\nrunContentScriptsCSS('${cssCode}')`
  })
  .join('\n');


const readManifestSync = extensionDir =>
  fs.readJsonSync(path.join(extensionDir, 'manifest.json'));

const writeManifestSync = (extensionDir, manifest) =>
  fs.writeJsonSync(
    path.join(extensionDir, 'manifest.json'),
    manifest,
    { spaces: 2 }
  );

module.exports = repackage;

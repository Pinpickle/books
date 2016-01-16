var hljs = require('highlight.js');
var stylus = require('stylus');
var childProcess = require('child_process');
var fs = require('fs');
var sync = require('synchronize');
var path = require('path');
var handlebars = require('handlebars');
var Promise = require('bluebird');
var markdown = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value;
        } catch (__) {}
      }

      return ''; // use external default escaping
  } })
  .use(require('markdown-it-attrs'))
  .use(require('markdown-it-footnote'))
  .use(require('markdown-it-math'));


var loadFile = Promise.promisify(fs.readFile);

// Load resources
var resources = { };

function loadResources() {
  resources.css = stylus(fs.readFileSync(path.join(__dirname, 'styles/main.styl'), 'utf8'))
    .set('filename', 'main.css')
    .set('paths', [path.join(__dirname, 'styles'), path.join(__dirname, 'node_modules')])
    .set('include css', true)
    .render();

  resources.template = handlebars.compile(fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8'));
}

loadResources();

exports.renderHTML = function renderHTML(md) {
  return new Promise((resolve, reject) => {
    resolve(resources.template({ styles: resources.css, content: markdown.render(md) }));
  });
};

exports.htmlToPDFStream = function htmlToPDFStream(html) {
  var prince = childProcess.spawn('prince', ['-']);

  prince.stdin.write(html);
  prince.stdin.end();

  return prince.stdout;
}

exports.markdownToFile = function markdownToFile(md, fileName) {
  exports.renderHTML(md)
    .then((html) => {
      fs.writeFileSync('test.html', html);
      var stream = exports.htmlToPDFStream(html);
      var file = fs.createWriteStream(path.join(process.cwd(), fileName));
      stream.pipe(file);

      return new Promise((resolve, reject) => {
        stream.on('close', (code) => {
          file.end();
          resolve();
        });
      });
    });
};

exports.renderFile = function renderFile(input, output) {
  return loadFile(path.join(process.cwd(), input), 'utf8')
    .then((data) => {
      return exports.markdownToFile(data, output);
    });
};

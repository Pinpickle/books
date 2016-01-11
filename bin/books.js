#! /usr/bin/env node

var books = require('../index.js');
var argv = require('yargs')
  .demand(2)
  .argv;

books.renderFile(argv._[0], argv._[1]);

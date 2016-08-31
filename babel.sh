#!/bin/bash

USAGE="Run Babel on everything below src, depositing the new files in ./lib"

if [[ $# == 1 ]]
then
    echo $USAGE
    exit 0
fi

echo "Running Babel..."
babel/node_modules/babel-cli/bin/babel.js src -d lib

echo "Copying HTML..."
cp src/html/*.css src/html/*.html lib/html/
cp src/html/js/*.min.* lib/html/js

echo "Running Browserify to make package..."
node_modules/.bin/browserify lib/html/js/confidenceEng.js -o lib/html/js/confidence.js

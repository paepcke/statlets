#!/bin/bash

USAGE="Run Babel on everything below src, depositing the new files in ./lib"

if [[ $# == 1 ]]
then
    echo $USAGE
    exit 0
fi

babel/node_modules/babel-cli/bin/babel.js src -d lib

cp src/html/*.css src/html/*.html lib/html/
cp src/html/js/*.min.* lib/html/js

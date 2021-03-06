#!/bin/bash

USAGE="./babel { confidence | correlation | probability }. Run Babel on everything below src/html, depositing the new files in ./lib."

# Now go through all the options
while getopts ":h" opt
do
    case $opt in
        h)
            shift
            echo $USAGE
            exit 0
            ;;
 
        \?)
            echo $USAGE
            break
            exit 1
            ;;
    esac
done

# Make sure one arg is left after
# the shifting above: the statlet
# name to process

if [ -z $1 ]
then
  echo $USAGE
  exit 1
fi

babelEnv=$1

export BABEL_ENV=$babelEnv

case "${babelEnv}" in

    confidence)

        echo "Babelizing statlet ${babelEnv}..."
        node_modules/babel-cli/bin/babel.js src/html/ -d lib/html/

        echo "Copying HTML..."
        cp src/html/confidence/*.css  lib/html/confidence
        cp src/html/confidence/*.html lib/html/confidence
        cp src/html/utils/*.css src/html/utils/*.html lib/html/utils
        cp src/html/utils/js/*.min.* lib/html/utils/js

        echo "Running Browserify to make package..."
        node_modules/.bin/browserify lib/html/confidence/js/confidenceEng.js \
                                     -o lib/html/confidence/js/confidence.js
        ;;

    correlation)

        echo "Babelizing statlet ${babelEnv}..."
        node_modules/babel-cli/bin/babel.js src/html/ -d lib/html/

        echo "Copying HTML..."
        cp src/html/correlation/*.css  lib/html/correlation
        cp src/html/correlation/*.html lib/html/correlation
        cp src/html/utils/*.css src/html/utils/*.html lib/html/utils
        cp src/html/utils/js/*.min.* lib/html/utils/js
        
        echo "Running Browserify to make package..."
        node_modules/.bin/browserify lib/html/correlation/js/correlationEng.js \
                                     -o lib/html/correlation/js/correlation.js
        ;;

    probability)

        echo "Babelizing statlet ${babelEnv}..."
        node_modules/babel-cli/bin/babel.js src/html/ -d lib/html/

        echo "Copying HTML..."
        cp src/html/probability/*.css  lib/html/probability
        cp src/html/probability/*.html lib/html/probability
        cp src/html/utils/*.css src/html/utils/*.html lib/html/utils
        cp src/html/utils/js/*.min.* lib/html/utils/js

        echo "Copying fonts..."
        mkdir -p lib/html/fonts/DSEG_v030/DSEG7
        cp -r src/html/fonts/DSEG_v030/DSEG14 lib/html/fonts/DSEG_v030/
        mkdir -p lib/html/fonts/Nosifer
        cp src/html/fonts/Nosifer/nosifer.js lib/html/fonts/Nosifer/

        echo "Copying images..."
        mkdir -p lib/html/images
        cp src/html/Images/skullAloneSmall.png lib/html/images
        
        echo "Running Browserify to make package..."
        node_modules/.bin/browserify lib/html/probability/js/probabilityEng.js \
                                     -o lib/html/probability/js/probability.js
#                                     --debug
        ;;

    scratch)

        #echo "Babelizing statlet ${babelEnv}..."
        #node_modules/babel-cli/bin/babel.js src/html/ -d lib/html/

        echo "Copying HTML..."
        cp src/html/scratch.html lib/html/
        
        echo "Copying fonts..."
        mkdir -p lib/html/fonts/DSEG_v030
        cp -r src/html/fonts/DSEG_v030/DSEG7 lib/html/fonts/DSEG_v030/
        cp -r src/html/fonts/DSEG_v030/DSEG14 lib/html/fonts/DSEG_v030/

        mkdir -p lib/html/fonts/SVG/LED/LEDFontSVG
        cp src/html/fonts/SVG/LED/LEDFontSVG/* lib/html/fonts/SVG/LEDFontSVG

        ;;

    scratch1)

        echo "Babelizing statlet ${babelEnv}..."
        node_modules/babel-cli/bin/babel.js src/html/ -d lib/html/

        echo "Copying HTML..."
        cp src/html/scratch1.html lib/html/
        cp src/html/utils/*.css  lib/html/utils
        cp src/html/utils/js/*.min.* lib/html/utils/js
        
        echo "Running Browserify to make package..."
        node_modules/.bin/browserify lib/html/js/scratch1Test.js \
                                     -o lib/html/js/scratch1.js
        ;;

    *)
        echo "Unknown statlet name '${babelEnv}'"
        exit 1
        ;;
esac
              

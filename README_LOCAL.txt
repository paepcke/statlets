
- To make public:

    o Make sure that /var/www/html/statlets-public
      is symlinked to /home/paepcke/EclipseWorkspaces/statlets/lib/public_html


    o Whenever you babel a new git-pull over to lib, do this:
       rm -rf lib/public_html
       cp -r lib/html lib/public_html

    o Edit lib/public_html/correlation/correlation.html
           lib/public_html/confidence/confidence.html
           lib/public_html/probability/probability.html

      to have this at the end:

        <script>                                                                                                                            
                document.cookie = "stats60Uid = preFlight*";
        </script>

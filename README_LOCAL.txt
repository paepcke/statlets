- To make public:
    o cp -r lib/html lib/public_html
    o In each js file:

         lib/public_html/correlation/js/correlation.js
         lib/public_html/confidence/js/confidence.js
         lib/public_html/probability/js/probability.js

      Search for 'CookieMonster()' and add after it:

        	//*******
		cookieMonster.setCookie("stats60Uid", "public");
		//*******

/*
 * Helps save and recall cookies in the browser.
 */

var CookieMonster = function() {
	
	
	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function() {
		return {
			setCookie : setCookie,
			getCookie : getCookie,
			delCookie : delCookie,
		}
	}

	/*---------------------------
	| setCookie
	-----------------*/
	
	var setCookie = function(cookieId, cookieValue, expDate) {
		/*
		 * Sets cookie for this document.
		 * 
		 * :param cookieId: name of cookie by which it will be
		 * 			retrievable.
		 * :type cookieId: string
		 * :param cookieValue: value of cookie. Value may
		 * 		be passed in not URL-safe. It will be
		 * 		made URL safe by this method.
		 * :type cookieValue: string
		 * :param expDate: cookie expiration date in 'reasonable'
		 * 		string format. Reasonable means digestible by toUTCString().
		 * :type expDate { string | undefined }
		 * 		
		 */

		// If expiration date is provided, convert to 
		// UTC str after a semicolon, else to empty str:
		if ( typeof(expDate) === 'undefined' ) {
			expDate = "";
		} else {
			try {
				expDate = '; expires=' + expdate.toUTCString();
			} catch (e) {
				throw (`Bad date string passed to setCookie: '${expDate}'`);
			}
		}
		cookieValue = escape(cookieValue) + expDate;
		document.cookie = `${cookieId} = ${cookieValue}`; 
	}
	
	/*---------------------------
	| getCookie
	-----------------*/

	var getCookie = function(cookieId) {
		/*
		 * Returns cookie of given id. If cookie
		 * not present, returns null. Cookies
		 * are provided by browsers in the form:
		 * 
		 *     "cookie1=value1; cookie2=value2; cookie3=value3"

		 * :param cookieId: Identifier of requested cookie
		 * :type cookieId: string
		 * :returns: un(URL-)escaped cookie value, or null.
		 * :rtype: { string | null }
		 */
		
		let allCookies = document.cookie;
		if ( allCookies.length === 0 ) {
			return null;
		}
		// Get ["cookie1=value1", "cookie2=value2", ...]
		let nmValPairStrs = allCookies.split(";");
		for ( let nmValPair of nmValPairStrs ) {
			let nmValArr = nmValPair.trim().split("="); 
			if ( nmValArr[0] === cookieId ) {
				return unescape(nmValArr[1]);
			}
		}
		return null;
	}
	
	/*---------------------------
	| delCookie 
	-----------------*/
	
	let delCookie = function(cookieId) {
		/*
		 * Deletes cookie of given ID by setting it
		 * to a past expiration date.
		 * 
		 * :param cookieId: ID of cookie to delete.
		 * :type cookieId: string
		 */
		// Make a date: beginning of epoch:
		let pastDateStr = new Date(0).toUTCString();
		document.cookie = `${cookieId}=; expires=${pastDateStr}`;
	}
	
	return constructor();
}

export {CookieMonster};
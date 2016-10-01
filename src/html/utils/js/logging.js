
		
import * as log4javascript from "./log4javascript.min";

var Logger = function( theContext, theAlerter, uid, seekAuthentication ) {

	var alerter	   	   		 = null;
	var myBrowser            = null;
	var myUid                = null;
	var logServerURL         = null;
	   	   
	var alerter	      	     = null;
	// "confidence", "correlation", etc.:
	var context				 = null;
	   	   
	var sentServerDwnMail    = false;
	var doAuthentication     = true;
	
	const LOG_SERVER_TIMEOUT = 1000; // msecs: timeout for logging server to respond.
	
	const SERVER_NOT_REACHED = 'Server unreachable';
	

	// Where usage activity goes:
	
	const LOGGING_PORT       = 8889;
	const ADMIN_EMAIL = 
		'<a class="forceClick" href="mailto:paepcke@cs.stanford.edu?Subject=Statlet%20Login%20Server%20Down" target="_top">Please email admin</a>'; 
	
	
	
	// Ability to suppress logging temporarily:
	var loggingSuppressed = false;
	
	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function(theContext, theAlerter, uid, seekAuthentication ) {
		
		alerter	= theAlerter;
		if ( (typeof(seekAuthentication) === 'undefined') || seekAuthentication ) {
			doAuthentication = true;
		} else {
			doAuthentication = false;
		}

		context = theContext;
		initLogging(uid);
		
		return {
			log 	         : log,
			allowLogging     : allowLogging,
			isLoggingAllowed : isLoggingAllowed,
			browserType  	 : browserType,
			userId			 : userId,
			setUserId        : setUserId,
		}
	}
	
	
	/*---------------------------
	| log 
	-----------------*/
	
	var log = function(txtJsonValue) {
		/*
		 * Logs given txt to logging server. For this
		 * application, legal JSON is expected, but not
		 * verified. This is best effort. No check made
		 * whether info arrives. 
		 */

		if ( loggingSuppressed  ) {
			return;
		}
		contactLogServer(
				{"reqType" : "log",
					"context" : context,       // "confidence", "correlation", etc.
					"uid"     : myUid,
					"action"  : txtJsonValue,
				},
				logServerURL
		)

	}
	
	/*---------------------------
	| allowLogging 
	-----------------*/
	
	var allowLogging = function(doAllow) {
		if ( doAllow ) {
			loggingSuppressed = false;
		} else {
			loggingSuppressed = true;
		}
	}
	
	/*---------------------------
	| isLoggingAllowed 
	-----------------*/
	
	var isLoggingAllowed  = function() {
		return ! loggingSuppressed;
	}
	
	/*---------------------------
	| userId 
	-----------------*/
	
	var userId = function() {
		return myUid;
	}
	
	/*---------------------------
	| setUserId 
	-----------------*/
	
	var setUserId = function(newUid) {
		myUid = newUid;
		return newUid;
	}
	/* ---------------------  Private Methods ------------------ */
	
	/*---------------------------
	| initLogging 
	-----------------*/
	
	var initLogging = function(uid) {
		/*
		 * Initializes write-back of user interactions
		 * with statlet to server. Assumes that instance
		 * variables myBrowser and myUid have been set.
		 * 
		 * Shows login dialog.
		 * 
		 * Returns true if access allowed, else returns
		 * false. In latter case the login dialog stays
		 * up.
		 * 
		 */
		
		// On first call, uid will be undefined.
		// Show login dialog. Second call will be triggered
		// from the dialog button push. 
		if ( typeof(uid) === 'undefined') {

			alerter.entryBox("Please enter your sunet ID:",
			                 "Log in",                   // Button label
			                 function(uid) {
								return initLogging(uid); // recursive call, this time
							 },                          // with UID from alert box.
							 alerter.ALLOW_EMPTY_FLD_OFF,
			                 alerter.FORCE_CLICK_TXT_OFF
			                 );
			return;
		}
		
		let originUrl = location.origin;
		
		// If origin is from a particular port,
		// chop that port off. The square-bracketed
		// expression gets past the http://:
		
		let re = /http:[^:]*:/g;
		let match = re.exec(originUrl);
		if ( match !== null ) {
			originUrl = originUrl.slice(0, re.lastIndex - 1);
		}
		
		let log = log4javascript.getLogger();
		logServerURL = `${originUrl}:${LOGGING_PORT}`;
	    let ajaxAppender = new log4javascript.AjaxAppender(logServerURL);
	    ajaxAppender.setThreshold(log4javascript.Level.ERROR);
	    log.addAppender(ajaxAppender);
	    
	    if ( doAuthentication ) {
	    	let authPromise = authenticate(uid, logServerURL) ;
	    	return authPromise
	    	.then(
	    			function (reqRes) {                    // resolved: server answered
	    				if ( reqRes === "loginOK" ) {      // with loginOK or loginNOK.
	    					return allowAccess(uid);
	    				} else if (reqRes === "loginNOK") {
	    					return denyAccess(uid);
	    				}
	    			}, 
	    			function(errorObj) {                   // rejected (server didn't answer)
	    				// Some server trouble; use special
	    				// uid and let user proceed:
	    				myUid = "logServerDown*";
	    				// Change same alert to notice that
	    				// login server down, and to please 
	    				// email admin:
	    				serverDownAlert(uid)
	    				// Returning false will take down the 
	    				// login softAlert:
	    				return true;
	    			});
	    }
	}
	
	
	/*---------------------------
	| serverDownAlert 
	-----------------*/
	
	var serverDownAlert = function(uid) {
		
		if (( ! sentServerDwnMail ) && isLoggingAllowed()) {
			// Queue next dialog box without entry fld,
			// but forcing user to click email link before
			// Continue button is enabled:
			alerter.fancy( `Login server unreachable. Please ${ADMIN_EMAIL}, then proceed to the statlet.`,
			               "Continue",                   // Button label
			               undefined,                    // No special button function
			               alerter.ALLOW_EMPTY_FLD_OFF,
			               alerter.FORCE_CLICK_TXT_ON,   // Must click on email link before
			               alerter.TXT_ENTRY_BOX_OFF     // ... button is available.
			               );
		}
		// Don't send more than once in same session:
		sentServerDwnMail = true;
		// Don't try to log to a dead server:
		allowLogging(false);
	}
	    
	/*---------------------------
	| allowAccess 
	-----------------*/
	   
	var allowAccess = function(uid) {
		myUid = uid;
		return true; // access OK
	}
	
	/*---------------------------
	| denyAccess 
	-----------------*/
	
	var denyAccess = function(uid) {
		
		// Login dialog is still up:
		
		alerter.changeInfoTxt(`'${uid}' not found in database:`);
		alerter.userWrong(true);
		return false;
	}

	/*---------------------------
	| authenticate 
	-----------------*/
	
	var authenticate = function(uid, originUrl) {
		
		return contactLogServer(
				{"reqType" : "login",
				 "context" : context,   // "confidence", "correlation", etc.
				 "uid"     : uid,
				 "action"  : `{ "loginBrowser" : "${browserType()}" }`,
				},
				originUrl
				)
	}
	
	/*---------------------------
	| contactLogServer 
	-----------------*/
		
	
	var contactLogServer = function(reqJson, theUrl) {

		let xhr     = new XMLHttpRequest();
		xhr.timeout = LOG_SERVER_TIMEOUT;
		
		return new Promise(function (resolve, reject) {
			xhr.open("POST", theUrl, true); // true for async; the default anyway
			xhr.onload = function () {
				if (this.status >= 200 && this.status < 300) {
					resolve(xhr.response);
				} else {
					try {
						let statusTxt = xhr.statusText;
					} catch (err) {
						statusTxt = 'Error getting statusTxt: ' + err;
					}
					let resJson   = `{status: "${this.status}", statusText: "${statusTxt}"}`;
					reject(resJson);
				}
			};
			
			xhr.onerror = function () {
				// Connection error:
				reject(SERVER_NOT_REACHED);
			};
			xhr.send(JSON.stringify(reqJson));
		});
	}
	
	/*---------------------------
	| browserType 
	-----------------*/
	
	var browserType = function() {

	    // Opera 8.0+
		if ((!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) {
			return 'Opera8+';
		}
		    // Firefox 1.0+
		if ( typeof InstallTrigger !== 'undefined' ) {
			return 'Firefox1+';
		}
		    // At least Safari 3+: "[object HTMLElementConstructor]"
		if ( Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0 ) {
			return 'Safari3+';
		}
		    // Internet Explorer 6-11
		let isIE = /*@cc_on!@*/false || !!document.documentMode;
		if (isIE) {
			return 'IE6-11';
		}
		    // Edge 20+
		if ( !isIE && !!window.StyleMedia ) {
			return 'Edge20+';
		}
		    // Chrome 1+
		if ( !!window.chrome && !!window.chrome.webstore ) {
			return 'Chrome1+';
		}
		    // Blink engine detection
		if ( (isChrome || isOpera) && !!window.CSS ) {
			return 'Blink';
		}
	}
	
	return constructor( theContext, theAlerter, uid, seekAuthentication );
}

export {Logger};
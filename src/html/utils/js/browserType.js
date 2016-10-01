var BrowserIdentifier = function() {

	//	Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
	let isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
	//	Firefox 1.0+
	let isFirefox = typeof InstallTrigger !== 'undefined';
    //	At least Safari 3+: "[object HTMLElementConstructor]"
	let isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
	//	Internet Explorer 6-11
	let isIE = /*@cc_on!@*/false || !!document.documentMode;
	//	Edge 20+
	let isEdge = !isIE && !!window.StyleMedia;
	//	Chrome 1+
	let isChrome = !!window.chrome && !!window.chrome.webstore;
	//	Blink engine detection
	let isBlink = (isChrome || isOpera) && !!window.CSS;

	var constructor = function() {
		return {
			isOpera : isOpera,
			isFirefox : isFirefox,
			isSafari  : isSafari,
			isIE	  : isIE,
			isEdge    : isEdge,
			isChrome  : isChrome,
			isBlink   : isBlink
		}
	}
	
	return constructor();
}

export { BrowserIdentifier };
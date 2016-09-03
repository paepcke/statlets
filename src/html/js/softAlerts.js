

var SoftAlert = function() {

	// Instance variables:
	var instance     = null;
	var showingAlert = false;
	var alertQueue   = [];

	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function() {
		if ( instance !== null ) {
			return instance;
		}
		return {
			note   : softAlertNote,
			fancy  : softAlertShow,
		}
	}
	
	/*---------------------------
	| softAlertNote 
	-----------------*/
	
	var softAlertNote = function(txt, forceClickInTxt) {
		/*
		 * Show a note above the onscreen material.
		 * Required parameter txt is the (HTML) text of the 
		 * note. If forceClickInTxt is truthy, then 
		 * the OK button is disabled, and the user needs to
		 * click on any link in the text that is classed
		 * "forceClick". If no such text is found, the 
		 * OK button will stay enabled. Otherwise the OK
		 * button is only enabled once the user clicked on
		 * one of the links in the text.
		 * 
		 * :param txt: text of note.
		 * :type txt: string
		 * :param forceClickInTxt: If forceClickInTxt is truthy, then 
		 *  	  the OK button is disabled, and the user needs to
		 *  	  click on any link in the text that is classed
		 *  	  "forceClick". If no such text is found, the 
		 *  	  OK button will stay enabled. Otherwise the OK
		 *  	  button is only enabled once the user clicked on
		 *  	  one of the links in the text.
		 *  :type forceClickInTxt: bool
		 * 
		 */
		
		
		softAlertShow(txt, forceClickInTxt, 'OK');
	}
	
	/*---------------------------
	| softAlertShow
	-----------------*/
	
	var softAlertShow = function(txt, forceClickInTxt, buttonLabel) {
		/*
		 * Show a note above the onscreen material.
		 * Required parameter txt is the (HTML) text of the 
		 * note. 
		 * 
		 * :param txt: text of note.
		 * :type txt: string
		 * :param forceClickInTxt: If forceClickInTxt is truthy, then 
		 *  	  the OK button is disabled, and the user needs to
		 *  	  click on any link in the text that is classed
		 *  	  "forceClick". If no such text is found, the 
		 *  	  OK button will stay enabled. Otherwise the OK
		 *  	  button is only enabled once the user clicked on
		 *  	  one of the links in the text.
		 *  :type forceClickInTxt: bool
		 *  
		 *  :param buttonLabel: label on the button. If not provided,
		 *  	  the label will be the string "OK".
		 *  :type buttonLabel: {string | undefined}
		 */
		
		if ( showingAlert ) {
			alertQueue.push(function() {
				softAlertShow(txt, forceClickInTxt, buttonLabel);
				})
			return;
		}

		showingAlert = true;
		
		d3.select("#softAlertTxt").node().innerHTML = txt;

		let btn = document.getElementById("softAlertOkBtn");
		if ( typeof(buttonLabel) === "string" ) {
			btn.innerHTML = buttonLabel;
		} else {
			// Default button txt:
			btn.innerHTML = 'OK';
		}
		
		d3.select("#softAlertOKBtn")
			.on("click", softAlertHide);
		if ( typeof(forceClickInTxt) !== 'undefined' && forceClickInTxt ) {
			softAlertForceClickInTxt()
		}
			 
		d3.select("#overlayDiv").classed("visible", true);
		d3.select("#softAlertDiv").classed("visible", true);
		d3.select("#softAlertDiv").classed("visible", true);
	}
	
	/*---------------------------
	| softAlertHide
	-----------------*/
	
	var softAlertHide = function() {
		/*
		 * Remove a softAlert from the screen.
		 */
		d3.select("#softAlertDiv").classed("visible", false);
		d3.select("#overlayDiv").classed("visible", false);
		
		showingAlert = false;
		if ( alertQueue.length > 0 ) {
			setTimeout(alertQueue.pop(), 1);
		}
	}
	
	/*---------------------------
	| softAlertOkButtonEnabled 
	-----------------*/
	
	var softAlertOkButtonEnabled = function(doEnable) {
		/*
		 * Enable or disable use of a softAlert's button.
		 * 
		 * :param doEnable: whether or not to enable the button:
		 * :type doEnable: bool
		 */
		let btn = document.getElementById("softAlertOkBtn");
		if ( doEnable ) {
			btn.disabled = false;
			btn.className = "button.softAlert";
		} else {
			btn.disabled = true;
			btn.className = "button.softAlert.disabled";
		}
	}

	/*---------------------------
	| softAlertForceClickInTxt
	-----------------*/
	
	var softAlertForceClickInTxt = function() {
		/*
		 * Look for links in an existing softAlert's note
		 * that is classed "forceClick". If found, button is
		 * disabled, and the links receive a listener that
		 * re-enables the button.
		 * 
		 */
		let links = document.getElementsByClassName("forceClick");
		for ( let link of links ) {
			link.addEventListener("click", softAlertOkButtonEnabled, true);
		}
		if ( links.length > 0 ) {
			softAlertOkButtonEnabled(false);
		}
	}
	
	return constructor();
}
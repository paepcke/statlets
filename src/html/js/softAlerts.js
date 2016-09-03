

var SoftAlert = function() {

	// Instance variables:
	var instance           = null;
	var showingAlert       = false;
	var alertQueue         = [];

	// For remembering event listeners to remove:
	var savedButtonFn	   = null;
    var savedTxtEntryFldFn = null;
	
	const FORCE_CLICK_TXT_ON  = true;
	const FORCE_CLICK_TXT_OFF = false;
	const TXT_ENTRY_BOX_ON    = true;
	const TXT_ENTRY_BOX_OFF   = false;

	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function() {
		if ( instance !== null ) {
			return instance;
		}
		
		// Clicking the softAlert button always
		// dismisses the dialog:
		document.getElementById("softAlertOkBtn")
			.addEventListener("click", softAlertHide);
		
		// Hide entry fld by default:
		document.getElementById("softAlertEntryFld")
			.className = "softAlertEntryFld visible";
		
		return {
			note     : softAlertNote,
			fancy  	 : softAlertShow,
			entryBox : entryBox,
			
			FORCE_CLICK_TXT_ON  : FORCE_CLICK_TXT_ON,
			FORCE_CLICK_TXT_OFF : FORCE_CLICK_TXT_OFF,
			TXT_ENTRY_BOX_ON    : TXT_ENTRY_BOX_ON,
			TXT_ENTRY_BOX_OFF   : TXT_ENTRY_BOX_OFF,
		}
	}
	
	/*---------------------------
	| veilVisible 
	-----------------*/
	
	var veilVisible = function(isVisible) {
		let veilDiv = document.getElementById("overlayDiv");
		if ( isVisible ) {
			veilDiv.className = "div overlayDiv visible";
		} else {
			veilDiv.className = "div overlayDiv";
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
		
		
		softAlertShow(txt,
				      undefined,    	 // buttonLabel
				      undefined,    	 // buttonFn,
				      undefined, 		 // entryFldKeyupFn,
				      forceClickInTxt,
				      TXT_ENTRY_BOX_OFF);
		
	}
	
	/*---------------------------
	| softAlertShow
	-----------------*/
	
	var softAlertShow = function(txt,
				                 buttonLabel,
				                 buttonFn,
				                 txtEntryFldFn,
				                 forceClickInTxt,
				                 showTxtEntryBox
				                 ) {
			
		/*
		 * Show a note above the onscreen material.
		 * Required parameter txt is the (HTML) text of the 
		 * note. 
		 * 
		 * :param txt: text of note.
		 * :type txt: string
		 * 
		 * :param buttonLabel: label on the button. If not provided,
		 *  	  the label will be the string "OK".
		 * :type buttonLabel: {string | undefined}
		 * 
		 * :param buttonFn: if provided, this function is made a 
		 * 		listener to click of the soft alert's button.
		 * :type buttonFn: function
		 * 
		 * :param txtEntryFldFn: if provided, this function is made a 
		 * 	    listener to keyUp of the text input field. If
		 * 		showTxtEntryBox is undefined, this parameter has
		 * 	    no effect.
		 * :type txtEntryFldFn: function
		 *  
		 * :param forceClickInTxt: If forceClickInTxt is truthy, then 
		 *  	  the OK button is disabled, and the user needs to
		 *  	  click on any link in the text that is classed
		 *  	  "forceClick". If no such text is found, the 
		 *  	  OK button will stay enabled. Otherwise the OK
		 *  	  button is only enabled once the user clicked on
		 *  	  one of the links in the text.
		 *  :type forceClickInTxt: bool
		 *  
		 *  :param showTxtEntryBox: if true, makes a text entry field visible
		 *  :type showTxtEntryBox: bool
		 */
		
		if ( showingAlert ) {
			alertQueue.push(function() {
				softAlertShow(txt, forceClickInTxt, buttonLabel, showTxtEntryBox);
				})
			return;
		}

		showingAlert = true;
		
		document.getElementById("softAlertTxt").innerHTML = txt;

		// Customize button label, and button listener:
		
		let btn = document.getElementById("softAlertOkBtn");
		if ( typeof(buttonLabel) === "string" ) {
			btn.innerHTML = buttonLabel;
		} else {
			// Default button txt:
			btn.innerHTML = 'OK';
		}
		
		if ( typeof(buttonFn) === 'function' ) {
			btn.on("click", buttonFn);
			// Remember fn so that softAlertHide() can
			// remove the listener:
			savedButtonFn = buttonFn;
		}
		
		if ( typeof(txtEntryFldFn) === 'function' ) {
			document.getElementById("softAlertEntryFld")
				.addEventListener("keyUp", txtEntryFldFn);
			// Remember function so that softAlertHide() can
			// remove the listener:
			savedTxtEntryFldFn = txtEntryFldFn;
		}
		
		if ( typeof(showTxtEntryBox) !== "undefined" ) {
			document.getElementById("softAlertEntryFld")
				.className = "softAlertEntryFld visible";
		}
		
		if ( typeof(forceClickInTxt) !== 'undefined' && forceClickInTxt ) {
			softAlertForceClickInTxt()
		}
			 
		// Turn on veil:
		veilVisible(true);

		// If requested, turn on txt entry box: 
		if ( typeof(showTxtEntryBox) !== 'undefined' && showTxtEntryBox ) {
			document.getElementById("softAlertEntryFld")
				.className = "softAlertEntryFld visible";
		}
		
		// Finally: turn on the dialog box:
		document.getElementById("softAlertDiv")
			.className = "softAlertDiv visible";
	}
	
	/*---------------------------
	| softAlertHide
	-----------------*/
	
	var softAlertHide = function() {
		/*
		 * Remove a softAlert from the screen.
		 */
		
		document.getElementById("softAlertDiv")
			.className = "softAlertDiv";
		
		// Turn off the text entry fld:
		let entryFld = document.getElementById("softAlertEntryFld")
		entryFld.className = "softAlertEntryFld";
		if ( savedTxtEntryFldFn !== null ) {
			entryFld.removeEventListener("keyup", savedTxtEntryFldFn);
			savedTxtEntryFldFn = null;
		}
		
		// If needed, remove extra listener from button:
		if ( savedButtonFn !== null ) {
			document.getElementById("softAlertOkBtn").removeEventListener(savedButtonFn);
			savedButtonFn = null;
		}
		
		showingAlert = false;
		
		if ( alertQueue.length > 0 ) {
			setTimeout(alertQueue.pop(), 1);
			return;
		}
		
		// No more alerts schedules: remove
		// the veil and click-blocker:
		veilVisible(false);
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
			btn.className = "button softAlert";
		} else {
			btn.disabled = true;
			btn.className = "button softAlert disabled";
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
	
	/*---------------------------
	| entryBox 
	-----------------*/

	var entryBox = function(promptTxt, buttonLabel, buttonFn, entryFldKeyupFn) {
		
		softAlertShow(promptTxt,
				      buttonLabel,
				      buttonFn,
				      entryFldKeyupFn,
				      FORCE_CLICK_TXT_OFF, 
				      TXT_ENTRY_BOX_ON);
	}
	
		
	return constructor();
}
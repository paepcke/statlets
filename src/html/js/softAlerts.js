

var SoftAlert = function() {

	// Instance variables:
	var instance           = null;
	var showingAlert       = false;
	var alertQueue         = [];

	// For remembering event listeners to remove:
	var savedButtonFn	   = null;
    var savedInfoTxt       = null;
    var savedAllowEmptyFld = false;
	
	const FORCE_CLICK_TXT_ON  = true;
	const FORCE_CLICK_TXT_OFF = false;
	const TXT_ENTRY_BOX_ON    = true;
	const TXT_ENTRY_BOX_OFF   = false;
	const ALLOW_EMPTY_FLD_ON  = true;
	const ALLOW_EMPTY_FLD_OFF = false;
	
	const ENTER_KEY					  = 13;

	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function() {
		if ( instance !== null ) {
			return instance;
		}
		
		// Clicking the softAlert button by default
		// dismisses the dialog:
		let btn = document.getElementById("softAlertOkBtn"); 
		btn.addEventListener("click", btnClicked);
		
		// ENTER button on text entry clicks the button:
		let txtEntryFld = document.getElementById("softAlertEntryFld"); 
		
		txtEntryFld.addEventListener("keyup", function(evt) {
					evt.preventDefault();
					// Always style alert box's info text
					// as "user is not wrong" once user
					// types, and set to original txt:
					changeInfoTxt(savedInfoTxt);
					userWrong(false);
					// If user hit ENTER, cause btn click:
					if ( evt.which === ENTER_KEY ) {
						btn.click();
					}
		})
		
		// Hide entry fld by default:
		txtEntryFld.className = "softAlertEntryFld";
		
		return {
			note          : softAlertNote,
			fancy         : softAlertShow,
			entryBox      : entryBox,
			changeInfoTxt : changeInfoTxt,
			userWrong	  : userWrong,
			
			FORCE_CLICK_TXT_ON  : FORCE_CLICK_TXT_ON,
			FORCE_CLICK_TXT_OFF : FORCE_CLICK_TXT_OFF,
			TXT_ENTRY_BOX_ON    : TXT_ENTRY_BOX_ON,
			TXT_ENTRY_BOX_OFF   : TXT_ENTRY_BOX_OFF,
			ALLOW_EMPTY_FLD_ON  : ALLOW_EMPTY_FLD_ON,
			ALLOW_EMPTY_FLD_OFF : ALLOW_EMPTY_FLD_OFF,
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
				      undefined,    	  // buttonLabel
				      undefined,    	  // buttonFn,
				      ALLOW_EMPTY_FLD_OFF,
				      forceClickInTxt,
				      TXT_ENTRY_BOX_OFF);
		
	}
	
	/*---------------------------
	| softAlertShow
	-----------------*/
	
	var softAlertShow = function(txt,
				                 buttonLabel,
				                 buttonFn,
				                 allowEmptyEntry,
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
		 * :param allowEmptyEntry: if true, (and txt entry fld is showing),
		 * 		honor OK button with empty fld. Else refuse.
		 * :type allowEmptyEntry: bool.
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
		
		// If already showing an alert, queue this one:
		if ( showingAlert ) {
			alertQueue.push(function() {
				softAlertShow(txt,
				              buttonLabel,
				              buttonFn,
				              allowEmptyEntry,
				              forceClickInTxt,
				              showTxtEntryBox)				
			})
			return;
		}

		showingAlert = true;
		
		savedAllowEmptyFld = allowEmptyEntry;
		
		// Main prose:
		document.getElementById("softAlertTxt").innerHTML = txt;
		savedInfoTxt = txt;

		// Customize button label, and button listener:
		
		let btn = document.getElementById("softAlertOkBtn");
		
		if ( typeof(buttonLabel) === "string" ) {
			btn.innerHTML = buttonLabel;
		} else {
			// Default button txt:
			btn.innerHTML = 'OK';
		}
		
		if ( typeof(buttonFn) === 'function' ) {
			// Remember fn so that btnClicked() can
			// invoke it:
			savedButtonFn = buttonFn;
		} else {
			savedButtonFn = null;
		}
		
		// Reveal txt entry box (or not): 
		
		if ( typeof(showTxtEntryBox) !== 'undefined' && showTxtEntryBox ) {
			document.getElementById("softAlertEntryFld")
				.className = "softAlertEntryFld visible";
		} else {
			document.getElementById("softAlertEntryFld")
				.className = "softAlertEntryFld";
		}

		// Force user to click a link in the text field?
		if ( typeof(forceClickInTxt) !== 'undefined' && forceClickInTxt ) {
			softAlertForceClickInTxt()
		}
			 
		// Turn on veil:
		veilVisible(true);

		
		// Finally: turn on the dialog box:
		document.getElementById("softAlertDiv")
			.className = "softAlertDiv visible";
	}
	
	/*---------------------------
	| btnClicked
	-----------------*/
	
	var btnClicked = function() {
		/*
		 * Called when alert's button is pushed:
		 * Remove a softAlert from the screen.
		 */
		
		// Get what's in the txt entry field:
		let entryFld = document.getElementById("softAlertEntryFld")
		let enteredTxt = entryFld.value;
		if ( enteredTxt.length === 0 && ! savedAllowEmptyFld ) {
			changeInfoTxt("Please enter a value...");
			userWrong(true);
			return;
		}
		
		// Turn off the text entry fld:
		entryFld.className = "softAlertEntryFld";

		// If requested, call client's passed-in button-pushed-fn,
		// expecting a promise:
		if ( savedButtonFn !== null ) {
			let userPromise = savedButtonFn(enteredTxt);
			userPromise.then(
					function( allDone ) {
						if ( allDone ) {
							shutDownTheAlert();
						} else {
							return;
						}
					},
					function( rejectedPromise ) {
						// Should not happen!
						shutdownTheAlert();
					})
		} else {
			shutDownTheAlert();
		}
	}
	
	/*---------------------------
	| shutDownTheAlert
	-----------------*/
	
	var shutDownTheAlert = function(){
	
		// User is OK with taking down the alert:
		savedButtonFn = null;
		
		// Turn off the dialog box:
		document.getElementById("softAlertDiv")
			.className = "softAlertDiv";
		
		showingAlert = false;
		
		// Put up next alert box in line, if any:
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

	var entryBox = function(promptTxt,
				      		buttonLabel,
				      		buttonFn,
				        	allowEmptyEntryFld,
				        	forceClickTxt
				        	) {
			
		softAlertShow(promptTxt,
				      buttonLabel,
				      buttonFn,
				      allowEmptyEntryFld,
				      forceClickTxt,
				      TXT_ENTRY_BOX_ON);
	}

	/*---------------------------
	| userWrong 
	-----------------*/
	
	var userWrong = function(userIsWrong) {
		/*
		 * If passed true, information text of the 
		 * alert box is turned red. Note that 
		 * any typing in the txt entry box will
		 * return the txt to non-wrong style:
		 */

		let infoTxt = document.getElementById("softAlertTxt"); 
		if ( userIsWrong ) {
			infoTxt.className = "softAlertTxt wrong";
		} else {
			infoTxt.className = "softAlertTxt";
		}
	}
	
	/*---------------------------
	| changeInfoTxt 
	-----------------*/
	
	var changeInfoTxt = function(newTxt) {
		/*
		 * Changes the info in the alert box. 
		 * BUT: any typing in entry box (if it's visible)
		 * reverts to original txt.
		 */
		let infoTxt = document.getElementById("softAlertTxt");
		infoTxt.innerHTML = newTxt;
	}
		
	return constructor();
}
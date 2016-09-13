import { StatsBarchartResizeHandler } from "./../../utils/js/statsBarchartResizeHandler";
import { SoftAlert } from "./../../utils/js/softAlerts";
import { CookieMonster } from "./../../utils/js/cookieMonster";
import { Logger } from "./../../utils/js/logging";
import * as ss from "./../../utils/js/simple-statistics.min";
import * as d3 from "./../../utils/js/d3.min";

var ProbabilityViz = function(width, height) {

	// Instance variables:

	var width   	     = width;
	var height  	     = height;
	var dragClickHandler = null;
	var currBtn		 	 = null; // Currently active exercise-step button.
	
	var xDomain 	     = null;
	var yDomain 	     = null;
	var xDomainAllStates = null;
	var xDomainSaved     = null;
	
	var browserType      = null;
	var alerter          = null;
	var logger           = null;
	var cookieMonster    = null;
	
	var svgMachines      = null;
	
	// Constants
	
	// Dimensions of one slot module:
	var MACHINE_BODY_WIDTH   = 100;
	var MACHINE_BODY_HEIGHT  = 300;
	// Frame width around one slot window
	// within a slot module:
	var SLOT_WINDOW_X        = 4;
	var SLOT_WINDOW_Y        = 4;

	
	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function() {

		// For non-modal alerts:
		alerter     = SoftAlert();
		// If this access to the page is just
		// the result of user clicking the New Sample
		// button, then don't ask for login again.
		// The button handler will have set a cookie:
		
		cookieMonster = CookieMonster();
		
		let uid = cookieMonster.getCookie("stats60Uid");
		if ( uid !== null ) {
			logger = Logger(alerter, uid, false);    // false: dont' authenticate 
			logger.setUserId(uid);
			cookieMonster.delCookie("stats60Uid");
		} else {
			logger = Logger(alerter);
		}
		browserType = logger.browserType();

		let machinesDiv = document.getElementById('machinesDiv');
			
		width  = machinesDiv.clientWidth;
		height = machinesDiv.clientHeight;
		
		//*************
		//height = 400;
		//*************			
		

		// The "+40" is a kludge! It accounts
		// for the additional space that the x-axis
		// labels will take once they are rotated
		// 45 degrees: 
		d3.select('#machinesDiv')
			.style("height", height + 40)
					
		svgMachines = d3.select("#machinesDiv").append("svg")
		.attr("width", "100%")
		.attr("height", "100%")
		.attr("id", "machinesSvg")
		.attr("class", "machinesSvg")
		
		if (browserType === 'Firefox1+') {
			svgMachines.attr("viewBox", `0 -60 ${width} 500`);
		} else {
			svgMachines.attr("viewBox", `0 -60 ${width} 500`);
		}

		createSlotModuleWell();
        addControlButtons();
		
		return {}
	}
	
	/*---------------------------
	| createSlotModuleWell 
	-----------------*/
	
	var createSlotModuleWell = function(moduleId) {
		/*
		 * Create one slot module. The optional 
		 * moduleId will be the id of the svg
		 * that contains the parts of the machine.
		 */

		let thisMachineSvg = svgMachines
		   .append("svg")
			  .attr("class", "slotModuleAssembly")
		thisMachineSvg
		   .append("rect")
		   	  .attr("x", 0)
		   	  .attr("y", 0)
		   	  .attr("width", MACHINE_BODY_WIDTH)
		   	  .attr("height", MACHINE_BODY_HEIGHT)
		   	  .attr("class", "machinesBody")
		
		if ( typeof(moduleId) !== 'undefined') {
			thisMachineSvg.attr("id", moduleId);
		}
		
		thisMachineSvg
			.append("rect")
			   .attr("class", "slotWindow innerShadow")
			   .attr("x", SLOT_WINDOW_X)
			   .attr("y", SLOT_WINDOW_Y)
			   .attr("width", MACHINE_BODY_WIDTH - 2*SLOT_WINDOW_X)
			   .attr("height", MACHINE_BODY_HEIGHT * 40/100) // 40% of module body.
	}
	
	/*---------------------------
	| addControlButtons 
	-----------------*/
	
	var addControlButtons = function() {
		
		d3.select(".controlButtonBar")
			.append('input')
			  .attr("type", "button")
			  .attr("id", "home")
			  .attr("value", "Home")
			  .attr("class", "button cntBtn");

		d3.select(".controlButtonBar")
			.append('input')
			  .attr("type", "button")
			  .attr("id", "step1")
			  .attr("value", "Step 1")
			  .attr("class", "button cntBtn")
	
		d3.select(".controlButtonBar")
			.append('input')
			  .attr("type", "button")
			  .attr("id", "step2")
			  .attr("value", "Step 2")
			  .attr("class", "button cntBtn");
		
		d3.select(".controlButtonBar")
			.append('input')
			  .attr("type", "button")
			  .attr("id", "step3")
			  .attr("value", "Step 3")
			  .attr("class", "button cntBtn");
		
		d3.select(".controlButtonBar")
			.append('input')
			  .attr("type", "button")
			  .attr("id", "reset")
			  .attr("value", "Reset")
			  .attr("class", "button cntBtn reset");

		d3.selectAll(".button.cntBtn")
			.on("click", function() {
				goToStep(this);
			});
			
		// Start in the Home state:
		let homeBtn = d3.select('#home').node();
		//****d3.select(homeBtn).attr('class', 'button cntBtn current');
		currBtn = homeBtn;
		// The following would log
		// a "user clicked Home button
		// event. Suppress that:
		try {
			logger.allowLogging(false);
			goToStep(homeBtn);
		} finally {
			logger.allowLogging(true);
		}
	}

	
	/*---------------------------
	| goToStep 
	-----------------*/
	
	var goToStep = function(stepButtonEl) {
		
		let stepName = stepButtonEl.id;
		
		// Turn off all instruction text, unless
		// caller just wants to reset the data to its
		// true values:
		if ( stepName !== 'reset' ) {
			
			d3.select(currBtn).attr('class', 'button cntBtn');
			// New 'currently active' button:
			currBtn = stepButtonEl;
			d3.select(currBtn).attr('class', 'button cntBtn current');

			d3.selectAll('.instrTxt.visible').classed('visible', false);
			// Turn on only the appropriate one:
			d3.select('#' + stepName + 'Txt').classed('visible', true);
		}

		log(stepName);
		
		switch (stepName) {
		case 'home':
			d3.select("#allStatesDiv")
			colBtnsVisible(false);
			break;
//		case "step1":
//			d3.select('#allStatesDiv')
//			colBtnsVisible(true);
//			break;
//		case "step2":
//			d3.select('#allStatesDiv')
//			colBtnsVisible(true);
//			break;
//		case "step3":
//			d3.select('#allStatesDiv')
//			colBtnsVisible(true);
//			break;
//		case "reset":
//			// Restore true birth rates:
//			teenBirthObj = JSON.parse(JSON.stringify(origTeenBirthObj));
//			// Restore original state sample:
//			xDomain = xDomainSaved.map(function(el) { return el });
//			// Remake the X axis, and redraw mean and CI bracket:
//			replaceXAxis( xDomain, true );
//			ensureRectHeights();			
//			break;
		}
	}

	/*---------------------------
	| colBtnsVisible 
	-----------------*/
	
	var colBtnsVisible = function(shouldBeVisible) {
		
		if (shouldBeVisible) {
			d3.select("#addState")
				.attr("class", "button sampleBtn first visible");
			d3.select("#newSample")
				.attr("class", "button sampleBtn visible");
		} else {
			d3.select("#addState")
				.attr("class", "button sampleBtn first");
			d3.select("#newSample")
				.attr("class", "button sampleBtn");
		}
	} 
	
	/*---------------------------
	| log 
	-----------------*/
	
	var log = function log( txt ) {
		// Convenience method for logging:
		logger.log(txt);
	}
	
	return constructor(width, height);
}

var probViz = ProbabilityViz(700, 400);


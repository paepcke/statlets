import { EventGenerator } from "./biasedEventGenerator";
import { StatsBarchartResizeHandler } from "./../../utils/js/statsBarchartResizeHandler";
import { DragHandler } from "./../../utils/js/generalDragHandler";
import { SoftAlert } from "./../../utils/js/softAlerts";
import { CookieMonster } from "./../../utils/js/cookieMonster";
import { Logger } from "./../../utils/js/logging";
import { CoordinateSystem } from "./../../utils/js/coordinateSystem";
import * as ss from "./../../utils/js/simple-statistics.min";
import * as d3 from "./../../utils/js/d3.min";

/*
 * TODO:
 * 		o Ganged modules don't have their history updated
 * 		o Remove empty top lines in slot window
 * 		o Indicate when mods close enough for coupling
 * 		o Win counter
 * 		o Win flash
 * 		o Try bootstrap
 * 		o Write text
 * 		o Lucas-matrix
 * 		o Firefox compatibility
 */

var ProbabilityViz = function(width, height) {

	// Instance variables:

	// Simple scenario: only two causes of
	// death. "complex" scenario: 20 causes:
	var scenario         = null;
	
	var width   	     = width;
	var height  	     = height;
	var slotWinWidth  	 = null;
	var slotWinHeight 	 = null;
	var dragClickHandler = null;
	var currBtn		 	 = null; // Currently active exercise-step button.
	
	var distribCoordSys  = null;
	
	var xDomain 	     = null;
	var yDomain 	     = null;
	var xDomainAllStates = null;
	var xDomainSaved     = null;
	
	var tooltipDivSel    = null;
	var tooltipTxtSel	 = null;
	
	var coordSysDistrib  = null;
	var distribCauses    = null;

	// The coordinate systems and hit counts for each slot module.
	// Maps a slot module body's id to an object that 
	// holds the module's text manager, hit count, and 
	// coordinate system instance:
	var slotBodies       = {};   

	var browserType      = null;
	var alerter          = null;
	var logger           = null;
	var cookieMonster    = null;
	
	var machinesSvg      = null;
	var distribSvg       = null;
	
	var eventGenerator   = null;
	
	// Bar-sliding dispatch for interested
	// listeners:
	var dispatchBarHeightChange = null;

	// Same for slot module having moved:
	var dispatchSlotModMoveEnd  = null;
	var dispatchMoveChainGang   = null;
	
	// Event for spinning done:
	var dispatchSpinDone = null;
	
	var selectedSlotModules = [];
	var slotModPeripherals  = {};
	
	// Dict with keys being chain gang leaders
	// (i.e. left-most slot module in a gang).
	// Values are arrays of win/lose records. 
	// A win/lose record is an n-tuple where n
	// is the number of gang members. When a
	// gang is spun multiple times, one n-tuple
	// is created for each spin. Used to record
	// the results of the asynchronously spinning
	// slot modules in a gang:
	var chainGangWinnings   = {};
	
	var fadeInTrans  	 = d3.transition("fadeIn");
	var fadeOutTrans 	 = d3.transition("fadeOut");
	
	// Constants
	
	const BARS_ARE_LINES              = true;
	
	// Probability distribution coordinate system:
	
	const X_AXIS_BOTTOM_PADDING       = 65; // X axis distance bottom SVG edge
	const X_AXIS_RIGHT_PADDING        = 50; // X axis distance right SVG edge
	
	const Y_AXIS_TOP_PADDING          = 0;
	const Y_AXIS_LEFT_PADDING   	  = 50; // Y axis distance from left SVG edge
	
	// Histogram coordinate systems:
	
	const X_AXIS_BOTTOM_PADDING_HIST  = 5;
	const X_AXIS_RIGHT_PADDING_HIST   = 3;
	
	const Y_AXIS_TOP_PADDING_HIST     = 250; // Slot mdoule histogram: Y axis distance from SVG top
	const Y_AXIS_LEFT_PADDING_HIST    = 25;
	
	const SLOT_MODULE_TOP_PADDING     = 5;  // Between top of outer slot module body and the slot text window.
	const SLOT_MODULE_LEFT_PADDING    = 5;  // Between left edge of outer slot module body and the slot text window.	
	const INTER_BUTTON_PADDING        = 3;  // vertical padding between Go buttons
	const ABOVE_BUTTON_PADDING        = 20;  // vertical padding between slot window and first Go button.
	
	const TOOLTIP_SHOW_DURATION       = 5000; // msecs
	
	// Dimensions of one slot module:
	
	var MACHINE_BODY_WIDTH   = 100;
	var MACHINE_BODY_HEIGHT  = 300;
	// Frame width around one slot window
	// within a slot module:
	var SLOT_WINDOW_X             = 4;
	var SLOT_WINDOW_Y             = 4;
	// Percentage window size of module body height
	var SLOT_WINDOW_HEIGHT_PERC   = 40/100;
	// Percentage of button height of module body height:
	var BUTTON_HEIGHT_PERC        = 10/100;
	// Between slot window and go button:
	var GO_BUTTON_TOP_GAP         = 30;
	// Padding between slot window text and the left
	// edge of the slot window:
	var SLOT_WINDOW_LEFT_PADDING  = 8;

	// Speed at which text in slot window
	// fades and appears with only one slot change:
	var SLOT_TXT_TRANSITION_SPEED_1   = 400; // msecs
	// Delays between runs of 10:
	var SLOT_TXT_TRANSITION_SPEED_10  = 10; // msecs
	var SLOT_TXT_TRANSITION_SPEED_100 = 10; // msecs
	
	// Amound of time a slot module stays red after success:
	var SUCCESS_COLOR_DURATION = 2000; // msec
	
	// Probability below which bars in the distribution
	// chart need a handle for dragging:
	var ADD_DISTRIB_BAR_HANDLE_THRESHOLED = 0.005; // probability

	// Minimum distance that slot modules must be to 
	// get pulled into docking:
	var DOCKING_RANGE    = 50;
	
	// Final distance between docked slot modules:
	var DOCKING_DISTANCE = 20;
	
	// Percentages of total deaths in 2013. This is an
	// excerpt of all death causes. The numbers are converted
	// to normalized probabilities in the constructor:
	let DEATH_CAUSES = {
			"Heart attack" : 0.0778452,
			"Bronchus or lung" : 0.0633627,
			"Obstructive pulmonary disease" : 0.0407527,
			"Stroke" : 0.0305610,
			"Unspecified dementia" : 0.0297248,
			"Alzheimer's disease" : 0.0281592,
			"Accidental poisoning" : 0.0046834,
			"Self-harm by firearm discharge" : 0.0045441,
			"Assault with firearm discharge" : 0.0040516,
			"Alcoholic cirrhosis of liver" : 0.0038670,
			"Fall on same level" : 0.0023345,
			"Pedestrian vehicle collision" : 0.0009915,
			"Exposure to natural cold" : 0.0002686,
			"Bacterial infection" : 0.0002003,
			"Sick sinus syndrome" : 0.0001744,
			"Fall on or from ladder" : 0.0001584,
			"Drowning in bath-tub" : 0.0001466,
			"Jump or lie before moving object" : 0.0001444,
			"Bicycle accident" : 0.0000718,
			"Explosion of other materials" : 0.0000541,
			"Furuncle of buttock" : 0.0000072
	};
	
	// Keep a copy of the original, i.e. true probabilities
	// to use for resetting to initial state:
	let savedDeathCauses = Object.assign({}, DEATH_CAUSES);
	
	// Simplified table for early steps:
	let DEATH_CAUSES_SIMPLE = {
			"Heart attack" : 0.0778452,
			"Stroke" : 0.0778452,       // Pretend equal probabilities
	};
	
	// Keep a copy of the original, i.e. true probabilities
	// to use for resetting to initial state:
	let savedDeathCausesSimple = Object.assign({}, DEATH_CAUSES_SIMPLE);
	
	
	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function(width, height) {

		// For non-modal alerts:
		alerter     = SoftAlert();
		
		cookieMonster  = CookieMonster();
		
		// If this script runs in a public_html
		// subdirectory, then don't ask for login,
		// but make uid be 'public' for logging:
		
		// From: "http://mono.stanford.edu/statlets-public/probability/probability.html"
		// get the part: "/statlets-public/probability/probability.html"
		let localPath = window.location.pathname;
		if ( localPath.startsWith("/statlets-public") ) {
			cookieMonster.setCookie("stats60Uid", "public");
		}
		
		//*******
		cookieMonster.setCookie("stats60Uid", "preflight");
		//*******
		
		// If this access to the page is just
		// the result of user clicking the New Sample
		// button, then don't ask for login again.
		// The button handler will have set a cookie:
		
		let uid = cookieMonster.getCookie("stats60Uid");
		if ( uid !== null ) {
			logger = Logger('probability', alerter, uid, false);    // false: dont' authenticate 
			logger.setUserId(uid);
			cookieMonster.delCookie("stats60Uid");
		} else {
			logger = Logger('probability', alerter);
		}
		browserType = logger.browserType();
		
		let machinesDiv = document.getElementById('machinesDiv');
			
		distribSvg = d3.select("#distribDiv").append("svg")
		   .attr("width", "100%")
		   .attr("height", "100%")
		   .attr("id", "distribSvg")
		   .attr("class", "distribSvg")

		// D3 custom event declarations:
		dispatchSlotModMoveEnd  = d3.dispatch("moved", "moveEnd");
		dispatchMoveChainGang   = d3.dispatch("moved");
		// Allow action after spinning the slots:
		dispatchSpinDone = d3.dispatch("oneSpinDone", 
									   "allSpinsDoneOneModule",
									   "allSpinsDoneAllModules");
		   
		   
		switchScenarios('simple');

		addControlButtons();

		createTooltip();
		createScoreBoard();
		
		return {}
	}
	
	/*---------------------------
	| switchScenarios
	-----------------*/
	
	var switchScenarios = function(newScenario) {
	
		if ( scenario === newScenario ) {
			return;
		}
		scenario = newScenario
		
		// Remove all existing slot modules:
		for ( let slotModId of Object.keys(slotBodies) ) {
			destroySlotModule(d3.select('#' + slotModId));
		}
		
		slotBodies = {};
		
		// Return the two probability distributions to their
		// true values:
		Object.assign(DEATH_CAUSES, savedDeathCauses);		
		Object.assign(DEATH_CAUSES_SIMPLE, savedDeathCausesSimple);		
		
		if ( newScenario === 'simple' ) {
			eventGenerator = EventGenerator(DEATH_CAUSES_SIMPLE);
		} else {
			eventGenerator = EventGenerator(DEATH_CAUSES);
		}
		normalizeDeathCauses();
		createCauseDistrib("simple");
		createSlotModule('urSlotModule');
	}
	
	/*---------------------------
	| createTooltip 
	-----------------*/
	
	var createTooltip = function() {
		/* Given a d3 slot body selection, create a 
		 * popup tooltip consisting of a div and an empty txt
		 * element. This tooltip is reused for all 
		 * chart bars. So this method is called only once.
		 */
		
		// Create the div that holds the text of 
		// tooltips:
		tooltipDivSel = d3.select("body")
							.append("div")	
							   .attr("class", "div tooltip");
		
		// Text element in tooltip: modified as needed;
		// initialized here to empty text:
		tooltipTxtSel = tooltipDivSel					   
						.append("text")
						  .attr("class", "div tooltip txt")
						  .text("");
	}
	
	/*---------------------------
	| createFormulaTip
	-----------------*/
	
	var createFormulaTip = function(slotModBodySel) {
		/*
		 * Given a d3 slot body selection, create a 
		 * popup tooltip consisting of a div and an empty txt
		 * element. It will hold the probability value in
		 * popup formulae.
		 * 
		 * Also creates a second pair div/txt to hold
		 * the operator when the module is docked with
		 * another module.
		 * 
		 * Adds the following property to the
		 * module's entry in slotBodies: 
		 * 
		 * 		- 'formulaSel'   : container holding one div
		 * 						   with probability txt, and
		 * 						   a second div with an algebraic
		 * 						   operator. 
		 * 
		 * This fomula popup is created and destroyed with
		 * slot bodies. So this method is called multiple time.
		 */

		// The following div that holds two inner divs. 
		// Those inner divs will hold a slot
		// module's probability and operator,
		// respectively:
		
		let formulaContainerSel = d3.select("body")
								  .append("div")
								  	 .attr("id", `${slotModBodySel.attr("id")}_formula`)
								  	 .attr("class", "formulaContainer");

		// Div holding the slot's betting probability:

        let formulaProbSel = formulaContainerSel
        	.append("div")
        		.attr("class", "formula probability")
				.classed("visible", false);
		
		// Text element for the probability;
		// initialized here to empty text:
		formulaProbSel
			.append("text")
 			  .attr("class", "formula txt probability")
			  .text("")
			  .classed("visible", false);			  

		// Div for the +/- operator that will straddle
		// over to a docked module:
        let formulaOpSel = formulaContainerSel
        	.append("div")
        		.attr("class", "formula operator")
				.classed("visible", false);        		
		
		// Text element in operator: modified as needed;
		// initialized here to empty text. Will be '*' or '+':
		formulaOpSel
			.append("text")
 			  .attr("class", "formula txt operator")
			  .text("")
			  .classed("visible", false);			  
		
		slotBodies[slotModBodySel.attr("id")]['formulaSel'] = formulaContainerSel;
	}
	
	/*---------------------------
	| showFormula 
	-----------------*/
	
	var showFormula = function(slotModBodySel, doShow, txt, operator) {
		
		if ( typeof(txt) === 'undefined' ) {
			txt = "0.5";
		}
		
		if ( typeof(operator) === 'undefined' ) {
			operator = "*";
		}

		
		let formContainerSel    = slotBodies[slotModBodySel.attr("id")]['formulaSel'];
		let slotModDimRect      = slotModBodySel.node().getBoundingClientRect();
		let probDivSel	   	    = formContainerSel.select(".probability"); 
		let operatorDivSel      = formContainerSel.select(".operator"); 
		let probDivDimRect      = probDivSel.node().getBoundingClientRect();
		let operatorDivDimRect  = operatorDivSel.node().getBoundingClientRect();

		probDivSel.select(".txt").text(txt);
		operatorDivSel.select(".txt").text(operator);
		
		// Move the formula container so that the
		// probability number is centered over 
		// the slot module, 3/4 down the module: 
		formContainerSel
			.style("left", `${slotModDimRect.left + 
							  slotModDimRect.width/2 -
							  probDivDimRect.width/2}px`)
			.style("top", `${slotModDimRect.bottom - slotModDimRect.height/4}px`);

		// Push the operator div to the right,
		// so that it straddles the crack between
		// two docked slot modules:
		probDivSel
			.style("margin-right", `10px`);
									  //operatorDivDimRect.width}px`);
		
		// Turn the formula on:
		formContainerSel.selectAll(".formula")
			.classed("visible", doShow);
		//formContainerSel.selectAll(".formula.txt")
        //		.classed("visible", doShow);		
	}
	
	/*---------------------------
	| destroyFormulaTip 
	-----------------*/
	
	var destroyFormulaTip = function(slotModBodySel) {
		
		
		// Retrieve the formula popup's div and text elements,
		// and remove them.
		
		let slotModId = slotModBodySel.attr("id");
		slotBodies[slotModId]['formulaDivSel'].remove();
		slotBodies[slotModId]['formulaTxtSel'].remove();
	}
	
	/*---------------------------
	| createSlotModule 
	-----------------*/
	
	var createSlotModule = function(moduleId) {
		/*
		 * Create one slot module. The optional 
		 * moduleId will be the id of the svg
		 * that contains the parts of the machine.
		 * 
		 * Returns a D3 selection of the outermost SVG
		 * that holds all the inner machinery of a slot module.
		 */

		// Outer body of this slot module (not an SVG rect!)
		
		// Get dimensions of the div that holds all slot modules:
		let machinesDivSel = d3.select("#machinesDiv");
		let machinesDivDimRect = machinesDivSel.node().getBoundingClientRect();

		let deathDistribTbl = null;
		
		if ( scenario === "simple" ) {
			deathDistribTbl = DEATH_CAUSES_SIMPLE;
		} else {
			deathDistribTbl = DEATH_CAUSES;
		}
		
		let slotModBodySel = machinesDivSel
			.append("rect")
				.style("position", "absolute")
				.style("left", `${machinesDivDimRect.left + SLOT_MODULE_TOP_PADDING}px`)
				.style("top", `${machinesDivDimRect.top   + SLOT_MODULE_LEFT_PADDING}px`)
				.attr("id", moduleId)
				.attr("class", "machinesBody");
				
		// Remember the current background gradient
		// so that visualizeSuccess() can reliable
		// that the background to this default:
		slotModBodySel.attr("defaultBackgroundDeco", slotModBodySel.style("background"));
				
		// Remember this slot module chassis:
		slotBodies[slotModBodySel.attr("id")] = {};
		
		// This slot module is not currently docked
		// with anyone:
		slotModBodySel.attr("dockedWithOnRight", "none");
		slotModBodySel.attr("dockedWithOnLeft", "none");
				
		// SVG that will hold all machine parts within the outer body:
		let slotModSvgSel = slotModBodySel
			.append("svg")
				.attr("class", "machinesSvg");
		
		// The slot window for the death causes text:
		let slotWindowRect = slotModSvgSel
			.append("rect")
				.attr("x", "5.5%")
				.attr("y", "4%")
				.attr("class", "slotWindowRect");

  	    // Add text to the slot window:
		slotWinHeight      = slotWindowRect.node().getBBox().height;
		slotWinWidth       = slotWindowRect.node().getBBox().width;
		let slotTxt1Sel = slotModSvgSel
			.append("text")
				.text("")
				.attr("id", "slotTxt1Sel")
				.attr("class", "slotWindowTxt");
		
		// Give this slot window text element to a manager
		// that is associated with this slot module:
		
		// Manager of text elements for slot modules:
		let slotTxtMan = TextManager();
		slotBodies[slotModBodySel.attr("id")].textManager = slotTxtMan;
		
		slotTxtMan.addTxtElement(slotTxt1Sel.node());
		
		// Attach an empty transition to this
		// selection for setSlotWindowTxt() to find:
		slotTxt1Sel.transition(fadeInTrans);
		
	    // Get the font size, and move the text element
		// down into the slot window:
		let fontSize = parseFloat(getComputedStyle(slotTxt1Sel.node()).fontSize);
		let toTxtBaseline  = fontSize + slotWinHeight / 4.
		slotTxt1Sel
			.attr("transform", 
				  `translate(${slotWinWidth / 2.}, ${toTxtBaseline})`
			);
		
		// Build the second txt element on top of the
		// first so the can be cross-faded:
		let slotTxt2Sel = slotModSvgSel
			.append("text")
				.text("")
				.attr("id", "slotTxt2Sel")				
				.attr("class", "slotWindowTxt")
				.attr("transform", 
						`translate(${slotWinWidth / 2.}, ${toTxtBaseline})`
				);
		
		// Give this slot window text element to the manager:
		slotTxtMan.addTxtElement(slotTxt2Sel.node());

		// Attach an empty transition to this
		// selection for setSlotWindowTxt() to find:
		slotTxt2Sel.transition(fadeOutTrans);
		
		slotBodies[slotModBodySel.attr("id")].deathCauseCounts = {};
		let deathCauseCounts = slotBodies[slotModBodySel.attr("id")].deathCauseCounts;
		
		for ( let cause of Object.keys(deathDistribTbl) ) {
			deathCauseCounts[cause] = 0;
		}
		
		setSlotWindowTxt(slotModBodySel, "Click a GO button");
		
		// A function that updates a slot module's histogram:
		let updateHistogram = partial(updateSlotModHistogram, slotModBodySel);
		
		addButton(slotModSvgSel, "Go", function(evt) {

			let slotModBodySel = d3.select(slotModSvgSel.node().parentNode);
			spinSlot(slotModBodySel, 1, SLOT_TXT_TRANSITION_SPEED_1, updateHistogram);
		});
		
		addButton(slotModSvgSel, "Go x10", function(evt) {
			
			let slotModBodySel = d3.select(slotModSvgSel.node().parentNode);
			spinSlot(slotModBodySel, 10, SLOT_TXT_TRANSITION_SPEED_10, updateHistogram);
		});
		
		addButton(slotModSvgSel, "Go x100", function(evt) {
			let slotModBodySel = d3.select(slotModSvgSel.node().parentNode);
			spinSlot(slotModBodySel, 100, SLOT_TXT_TRANSITION_SPEED_10, updateHistogram);
		});
		
		// Add small death cause occurrences histogram
		// at bottom of chassis:

		addSlotModFrequencyChart(slotModSvgSel); // Histogram of hits.
		addBettingSelection(slotModBodySel);     // Betting selector element at bottom
		addAndOrSelection(slotModBodySel);       // Docking and/or/Undock selector
		createFormulaTip(slotModBodySel);
		//**********
		showFormula(slotModBodySel, true);
		//**********		
		
		addSlotModuleDragging(slotModBodySel);
		
		return slotModSvgSel;
	}
	
	/*---------------------------
	| destroySlotModule 
	-----------------*/
	
	var destroySlotModule = function(slotModBodySel) {
		destroyFormulaTip(slotModBodySel);
		delete slotBodies[slotModBodySel.attr("id")];
		slotModBodySel.remove();
	}
	
	/*---------------------------
	| spinSlot 
	-----------------*/
	
	var spinSlot = function(slotModBodySel, numSpins, speed, callback) {
		/*
		 * Finds the chain gang members of which the given slot module
		 * is a part. Spins each of the member numSpins time at the
		 * given speed. The spins occur asynchronously. But there are
		 * numSpins win/lose n-tuples, where n is the number of gang
		 * members. The method uses the chainGangWinnings dict to record
		 * for each spin which member lost or won. Assuming n==4, and
		 * numSpins==2, the resulting data structure might be:
		 * 
		 * 		{gangLeader:  [[1,1,0,0],
		 * 					   [1,1,0,0]
		 *                    ]
		 * where gangLeader is the d3 selection of the left-most gang member.
		 * The structure will be used in after all spins are done to 
		 * increase the overall win tally on the score board. Note that
		 * the rows are constructed asynchrously as individual spins
		 * finish.
		 * 
		 * The callback is called whenever any of the slot modules changes
		 * text. Additionally: two dispatch events are triggered. In 
		 * each function registered with these events, 'this' will be bound
		 * to the d3 select of the respective slot module:
		 *  
		 *    - allSpinsDoneOneModule         ;; All spins of one module are done.
		 *    - allSpinsDoneAllModules        ;; All modules are done spinning.
		 * 
		 */

		// Needed in the following handler, so declared
		// here; initialized below, before handler ever 
		// called:
		let gangSize = null;

		// Listen for the spin-done event of each module:
		// Determine when the last spin is done for each
		// module. Then trigger the allSpinsDoneOneModule 
		// event. Also detect when all spins of all gang
		// members are done. Then raise the allSpinsDoneAllModules
		// event In the handler function, 'this'
		// will be bound to the d3 slot module body selection
		// whose text just changed. Parameter nth will
		// contain the spin count: the how-many-th spin
		// of the final numSpins the handler call is about:
		
		dispatchSpinDone.on("oneSpinDone", function(nth) {

			// One slot module is done spinning.
			// Register its win/lose condition:
			let gangPos = getChainGangPosition(this, chainGang);
			chainGangWinnings[gangLeader][nth][gangPos] = didWin(this);
			
			// Done with all its spins?
			if ( nth >= numSpins-1 ) {
				// Pass the slot body selection both, bound to 'this',
				// and as a parameter for clarity at the destination
				// function:
				dispatchSpinDone.call("allSpinsDoneOneModule", this, this);
				gangSize--;
				if ( gangSize <= 0 ) {
					dispatchSpinDone.call("allSpinsDoneAllModules", this, this);
				}
			}
		});
		
		let txtInfo   = [];
		// Get the members of the given module's gang, incl.
		// the module itself (the 'true'):
		let chainGang  = getChainGangMembers(slotModBodySel, true);
		gangSize   = chainGang.length;
		let gangLeader = chainGang[0];
		// Initialize the chainGangWinnings structure:
		let winRecords = []
		for ( let i=0; i<numSpins; i++ ) {
			// Provide a gang-wide array of zero (numbers, not strings):
			winRecords.push(new Array(gangSize+1).join('0').split('').map(parseFloat));
		}
		chainGangWinnings[gangLeader] = winRecords;

		// Pick numSpins random death causes:
		for ( let thisSlotModBodySel of chainGang ) {
			for ( let i=0; i<numSpins; i++ ) {
				let deathCause = eventGenerator.next();
				txtInfo.push(deathCause);
				// Add this cause to the count that shows
				// up in the bar chart inside each slot
				// module:
				addDeathCauseCount(thisSlotModBodySel, deathCause);
			}
			setSlotWindowTxt(thisSlotModBodySel,
					txtInfo, 
					speed,
					callback);
		}
	}

	/*---------------------------
	| addSlotModFrequencyChart
	-----------------*/
	
	var addSlotModFrequencyChart = function(slotModSvgSel) {
		
		let deathDistribTbl = null;
		
		if ( scenario === "simple" ) {
			deathDistribTbl = DEATH_CAUSES_SIMPLE;
		} else {
			deathDistribTbl = DEATH_CAUSES;
		}
		
		let histXDomain = Object.keys(deathDistribTbl);
		let histYDomain = [0, 50];
		
		let X_AXIS_RIGHT      = X_AXIS_RIGHT_PADDING_HIST;
		let X_AXIS_BOTTOM     = X_AXIS_BOTTOM_PADDING_HIST;
		
		let Y_AXIS_LEFT       = Y_AXIS_LEFT_PADDING_HIST;
		    
		let body              = slotModSvgSel.node().parentNode;
		let bodyHeight        = body.clientHeight;
		let bodyWidth         = body.clientWidth;
		let goButtonArr       = slotModSvgSel.node().getElementsByClassName("goButton");
		let lowestBtn         = goButtonArr[goButtonArr.length - 1];
		let lowestBtnDims     = lowestBtn.getBBox();
		let histTop           = lowestBtnDims.y + lowestBtnDims.height;
		let histHeight        = bodyHeight - histTop;
		
        // Argument for CoordinateSystem():
        let coordInfo  = {svgSel         : slotModSvgSel, 
        				   x: {scaleType : 'ordinal',
        					   domain    : histXDomain,
        					   axisLabel : 'Cause of Death Count',
        					rightPadding : X_AXIS_RIGHT,
        				   bottomPadding : X_AXIS_BOTTOM,
        					leftPadding  : 0
        				   },
            			   y: {scaleType : 'linear',
            				      domain : histYDomain,
            				   axisLabel : '',
            				 roundTicks  : true,
            			     leftPadding : Y_AXIS_LEFT,
            			     topPadding  : (histTop + 2*INTER_BUTTON_PADDING),
            			   bottomPadding : X_AXIS_BOTTOM,
            			   },
            			   height        : bodyHeight - 2*INTER_BUTTON_PADDING
        };
        
        // For the simple scenario there are only two 
        // causes. Make the frequency count bars a bit
        // thinner so they don't run into each other:
//        if ( scenario === 'simple' ) {
//        	coordInfo.width = slotModSvgSel.node().parentElement.clientWidth - 10;
//        }
        
        // Get selection of slot body chassis:
        let slotModBodySel = d3.select(slotModSvgSel.node().parentNode);
        // And save this slot module's coordinate system there:
        slotBodies[slotModBodySel.attr("id")].coordSys = CoordinateSystem(coordInfo); 
	}	

	/*---------------------------
	| addBettingSelection 
	-----------------*/
	
	var addBettingSelection = function(slotModBodySel) {
		/*
		 * Add betting selection box at bottom of slot module:
		 */
		
		let deathCauseTbl = null
		
		if ( scenario === 'simple' ) {
			deathCauseTbl = DEATH_CAUSES_SIMPLE;
		} else {
			deathCauseTbl = DEATH_CAUSES;
		}
		
		let bettingSel = slotModBodySel
			.append("select")
			.attr("class", "bettingSelector")
			.on("focus", function() {
				setBettingEntries(d3.select(this), Object.keys(deathCauseTbl));
				let savedIndx = d3.select(this).attr("savedIndx"); 
				if ( typeof(savedIndx) !== 'undefined') {
					this.selectedIndex = savedIndx;
				}
			})
			.on("blur", function() {
				// Remember the index of the death cause in this
				// slot module's betting selector. Then replace
				// the death cause shown in the betting selector
				// by an abbreviation (first 13 chars followed
				// by ellipses) to that bet id not wider than
				// slot module body:
				let deathCause = this.value;
				let abbrev = deathCause.slice(0,13) + '...';
				let oldSelIndx = this.selectedIndex;
				setBettingEntries(d3.select(this), [abbrev])
					.attr("selectedIndex", 0)
					.attr("savedIndx", oldSelIndx)
					.attr("fullDeathCause", deathCause);
			})
			
		setBettingEntries(bettingSel, ["Place your bet"]);
	}
	

	/*---------------------------
	| addAndOrSelection 
	-----------------*/
	
	var addAndOrSelection = function(slotModBodySel) {
		/*
		 * Add AND/OR slide-out selection pulldown at side of slot module.
		 */
		
		let andOrSel = slotModBodySel
			.append("select")
			.attr("class", "andOrSelector")
			.style("opacity", 0)
			.classed("unselectable", true)
			.attr("id", function() {
				return slotModBodySel.attr("id") + "_andOrSel";
			})
		
		andOrSel.selectAll("option")
				.data(["and", "or", "Undock"])
				.enter()
				.append("option")
					.each(function(txt) {
						this.text = txt;
				});
		// Display first choice:
		andOrSel.attr("selectedIndex", 0);
		andOrSel.on("change", function() {
			andOrSelChanged(this);
		})
		
		// Position the selector at height of GO button:
		let goTxtDimRect      = slotModBodySel.select(".goText").node().getBoundingClientRect();
		let slotModBodDimRect = slotModBodySel.node().getBoundingClientRect();
		let topSelEdge        = goTxtDimRect.top - slotModBodDimRect.top - goTxtDimRect.height/2;
		
		andOrSel.style("left", `${slotModBodDimRect.width}px`); // right edge of slot mod body		
		andOrSel.style("top", `${topSelEdge}px`);
		
		// Let the slot module and the selector
		// know about each other:
		
		andOrSel.attr("mySlotMod", function() {
			return slotModBodySel.attr("id");
		});
		
		slotModBodySel.attr("myAndOrSel", function() {
			return andOrSel.attr("id");
		});
		
		// Initially hide the selector:
		showAndOrSel(slotModBodySel, false);

		return andOrSel;
	}
	
	/*---------------------------
	| showAndOrSel 
	-----------------*/
	
	var showAndOrSel = function(slotModBodySel, doShow) {

		let andOrSel           = slotModBodySel.select(".andOrSelector");
		let andOrDimRect       = andOrSel.node().getBoundingClientRect();
		let slotModDimRect     = slotModBodySel.node().getBoundingClientRect();
		
		let andOrTargetLeft    = null;
		let andOrTargetOpacity = null;

		if ( doShow ) {

			if ( isAndOrSelShowing(slotModBodySel) ) {
				return; // already visible
			}
			
			// Make the and/or selector usable:
			andOrSel.classed("disabled", false);
			
			// Distances are relative to left edge of slot module:
			andOrTargetLeft    = slotModDimRect.right - slotModDimRect.left - andOrDimRect.width/3.;
			andOrTargetOpacity = 1;

		} else {

			if ( ! isAndOrSelShowing(slotModBodySel) ) {
				return; // Already hidden
			}
			
			// Prevent the and/or selector from popping
			// up though the body of slot modules while
			// hidden behind the bodies:
			andOrSel.classed("disabled", true);
			
			andOrTargetLeft = 0; // relative to left edge of the slot module.
			andOrTargetOpacity = 0;

		}
		
		andOrSel
		.transition()
		.duration(800)
		.style("left", `${andOrTargetLeft}px`)
		.style("opacity", `${andOrTargetOpacity}`);
		
	}
	
	/*---------------------------
	| andOrSelChanged 
	-----------------*/

	var andOrSelChanged = function(selectorDomEl) {
		
		let optionStr = selectorDomEl.selectedOptions[0].value;
		if ( optionStr === "Undock" ) {
			let slotModId = d3.select(selectorDomEl).attr("mySlotMod");
			let slotModBodySel = d3.select("#" + slotModId);
			undock(slotModBodySel);
			selectorDomEl.selectedIndex = 0;
		}
	}
	
	/*---------------------------
	| getAndOrValue
	-----------------*/
	
	var getAndOrValue = function(slotModBodySel) {
		/*
		 * Examines the selected module's right-side docking connector.
		 * Returns "AND", "OR", or undefined. Note the upper case.
		 * 
		 * :param slotModBodySel: d3 selection of slot module whose
		 * 		right-side docking connector is to be investigated.
		 * :type slotModBodySel: d3-selection
		 * :return undefined if nobody is docked to the given
		 * 		module's right. Else return "AND" if the dock
		 * 		connector is set to AND, or "OR" if not.  
		 * :rtype { "AND" | "OR" | undefined }
		 */

		if ( ! isAndOrSelShowing(slotModBodySel) ) {
			return undefined;
		}
		let andOrSelNode = slotModBodySel.select(".andOrSelector").node();
		return andOrSelNode.value.toUpperCase();
		
	}
	
	/*---------------------------
	| getChainAndOrValues
	-----------------*/
	
	var getChainAndOrValues = function(slotModBodySel) {
		/*
		 * 
		 * Returns an array of "and" and "or" values that
		 * reflect the current settings of the and/or docks
		 * between the chain gang of which the given slot module
		 * is a part. Example: ["and", "or", "or", "and"]
		 */
		
		let operators = [];
		// Go through each chain gang member, incl.
		// the given member (the 'true' in the following call):
		for ( let member of getChainGangMembers(slotModBodySel, true)) {
			let op = getAndOrValue(member);
			if ( typeof(op) !== 'undefined' ) {
				operators.push(op.toLowerCase());
			}
		}
		return operators;
	}
	
	/*---------------------------
	| shovelZOrder 
	-----------------*/
	
	var shovelZOrder = function() {
		/*
		 * Modifies all currently visible slot modules' z-index
		 * so that the left-most module is highest, and the others
		 * are successively lower. This is needed so that the 
		 * and/or connectors are never below a slot module.
		 */

		// Find the left-most slot module:
		let leftEdgeSlotMods = {};
		
		d3.selectAll(".machinesBody")
			.each(function() {
				leftEdgeSlotMods[this.getBoundingClientRect().left] = d3.select(this); 
			});
		// Sort the left edge values...
		let sortedKeys  = Object.keys(leftEdgeSlotMods).sort(function (a, b) {  return a - b;  });
		sortedKeys.reverse();
		// ... by decreasing value:
		for ( let i=0; i<sortedKeys.length; i++) {
			// Assign the z-index:
			leftEdgeSlotMods[sortedKeys[i]].style("z-index", i);
		}
		
	} 	
	
	/*---------------------------
	| isAndOrSelShowing 
	-----------------*/
	
	var isAndOrSelShowing = function(slotModBodySel) {
		/*
		 * Given a slot module body, return true if its
		 * AND/OR selector is showing. Else return false.
		 */

		let andOrSel = slotModBodySel.select(".andOrSelector");
		let andOrDimRect = andOrSel.node().getBoundingClientRect();
		let slotModDimRect = slotModBodySel.node().getBoundingClientRect();
		
		// Does the andOr selector stick out beyond the 
		// border of its slot module?
		return andOrDimRect.right > slotModDimRect.right + 
									parseFloat(slotModBodySel.style("border"));
	}
	
	
	/*---------------------------
	| setBettingEntries 
	-----------------*/
	
	var setBettingEntries = function(selectBoxSel, txtArr) {
		
		selectBoxSel.selectAll("option").remove();

		selectBoxSel.selectAll("option")
			.data(txtArr)
			.enter()
			.append("option")
				.each(function(txt) {
					this.text = txt;
				});
		return selectBoxSel;
	}
	
	/*---------------------------
	| addButton 
	-----------------*/
	
	var addButton = function(slotModSvgSel, text, clickFunc) {

		// Find the already-existing buttons
		// to compute where the new button should
		// go (vertical dim):
		let distanceBelowSlotWin = SLOT_MODULE_TOP_PADDING +
								   slotModSvgSel.select(".slotWindowRect").node().getBBox().height +
								   ABOVE_BUTTON_PADDING;
		
		slotModSvgSel.selectAll(".goButton")
			.each(function() {
				distanceBelowSlotWin += this.getBBox().height + INTER_BUTTON_PADDING;
			});

		// Go button rect
		let goButtonSel = slotModSvgSel
			.append("rect")
			   .attr("class", "goButton")
			   .attr("id", `goButton_${text.replace(' ', '_')}`)
			   .attr("x", "5.5%")
			   .attr("y", distanceBelowSlotWin)
			   .on("click", clickFunc);
		
	    // Go button text:
		let goButtonCoords = goButtonSel.node().getBBox();
		let txtX = goButtonCoords.x + goButtonCoords.width / 2.;
		let txtY = goButtonCoords.y + goButtonCoords.height * 6. / 8.;
		let goTextSel = slotModSvgSel
		    .append("text")
		    	.text(text)
		    	.attr("x", txtX)
		    	.attr("y", txtY)
		    	.attr("class", "goText")
		    	.attr("id", `goText_${text.replace(' ', '_')}`)
		    	.on("click", clickFunc);
		
	}
	
	/*---------------------------
	| addSlotModuleDragging 
	-----------------*/
	
	var addSlotModuleDragging = function(slotModuleSel) {
		
		// Create a drag handler for this slot module,
		// passing the base assembly's SVG. 
		let slotModId = slotModuleSel.attr("id");
		if ( typeof(slotModId) === 'undefined') {
			throw("Slot modules must have an 'id' property.");
		}
		// Register this module, and add the drag handler:
		slotModPeripherals[slotModId] = {"dragHandler" : DragHandler(slotModuleSel.node())};
		slotModPeripherals[slotModId]["slotModBodySel"] = slotModuleSel;
		
		slotModuleSel
	      	// Attach drag-start behavior to this slot module.
	      	// Couldn't get a separate function to work
	      	// here: The dragstart/drag/dragend below should
	      	// be in a function that returns the behavior.
	      	// Didn't work.
	      	.call(d3.drag()
				.on("start", function(d) {
					
					// D3-select the DOM element that's trying
					// to be dragged:
					let modSel = d3.select(this);
					
					// Is the element one of our slot modules?
					if (modSel.attr('class') !== 'machinesBody') {
						// Was running mouse over something other than
						// one of our slot module bodies:
						return;
					}
					
					// Allow us to style a moving slot module if we want:
					modSel.classed("dragging", true);

					// Remember the slot module that's in motion:
					d3.drag.currSlotMod = this;
					// Remember its original position so that
					// we can return it there if needed:
					d3.drag.origSlotModPos = { x : this.x, y : this.y };
					
				})
				.on("drag", function(d) {
					let modSel = d3.select(this);
					if (modSel.empty()) {
						// Not over a slot module:
						return;
					} 
					
					if (! modSel.classed("dragging")) {
						// Not over something being dragged:
						return;
					}
					
					let mouseDx = d3.event.dx;
					let mouseDy = d3.event.dy;
					
					let slotModBodySel     = slotModPeripherals[slotModId]["slotModBodySel"];
					let slotModDimRect     = slotModBodySel.node().getBoundingClientRect();
  
					let newSlotModLeft     = slotModDimRect.left + mouseDx;
					let newSlotModRight    = slotModDimRect.right + mouseDx;
					let newSlotModTop      = slotModDimRect.top + mouseDy;
					let newSlotModBottom   = slotModDimRect.bottom + mouseDy;
					let machinesDivDimRect = d3.select("#machinesDiv").node().getBoundingClientRect();
					
					// Ensure machines stay within the machines div:
//					if ( newSlotModLeft   < machinesDivDimRect.left ||
//						 newSlotModRight  > machinesDivDimRect.right ||
//						 newSlotModTop    < machinesDivDimRect.top ||
//						 newSlotModBottom > machinesDivDimRect.bottom ) {
//						
//						return;
//					}
					
					let dragHandler    = slotModPeripherals[slotModId]["dragHandler"];
					dragHandler.dragmove(slotModBodySel, false); // false: NOT an SVG element; outer body is an HTML5 rect
					
					// Let interested parties know that a slot module was moved.
					// The 'modSel' parameter will be bound to 'this' in the called
					// methods:
					dispatchMoveChainGang.call("moved", modSel, mouseDx, mouseDy, dragHandler);
					// announce that a module just moved; used to
					// change module color if close to potential
					// dock-partner:
					dispatchSlotModMoveEnd.call("moved", modSel);					
				})
				.on("end", function(d) {
					let modSel = d3.select(this);
					modSel.classed("dragging", false);
					d3.drag.currSlotMod = undefined;
					
					// Let interested parties know that user
					// is done moving a module:
					dispatchSlotModMoveEnd.call("moveEnd", modSel);
					// Ensure that the modules are still/again 
					// in the proper z-order so that and/or connectors
					// are fully visible:
					shovelZOrder();
					upLog("dragSlotMod");
				})
	      	)
		
	}
	
	/*---------------------------
	| createCauseDistrib
	-----------------*/
	
	var createCauseDistrib = function() {
		/*
		 * Create the right-side bar chart containing the 
		 * death cause distributions.
		 */

		let deathDistribTbl = null;
		
		if ( scenario === "simple" ) {
			deathDistribTbl = DEATH_CAUSES_SIMPLE;
		} else {
			deathDistribTbl = DEATH_CAUSES;
		}
		let distribDiv = document.getElementById('distribDiv');
		
		// Clear out whatever is in the div's SVG:
		distribSvg.selectAll("*").remove();
			
		width  = distribDiv.clientWidth;
		height = distribDiv.clientHeight;
		
		//*************
		height = 400;
		//*************			
		

		// The "+40" is a kludge! It accounts
		// for the additional space that the x-axis
		// labels will take once they are rotated
		// 45 degrees: 
		d3.select('#distribDiv')
			.style("height", height + 40)
					
		dragClickHandler = StatsBarchartResizeHandler(distribSvg);
		
		if ( scenario === 'simple' ) {
			yDomain      = [0, 1];
		} else {
			yDomain      = [0, Math.max.apply(null, Object.values(deathDistribTbl))];
        }
        xDomain      = Object.keys(deathDistribTbl);
        
        // Remember original samples for resetting (via reset button):
        xDomainSaved = xDomain.map(function(el) { return el });
        
        // Argument for makeCoordSys:

        let coordInfo  = {svgSel         : distribSvg, 
        				   x: {scaleType : 'ordinal',
        					   domain    : xDomain,
        					   axisLabel : 'Cause of Death Probabilities',
        				   bottomPadding : X_AXIS_BOTTOM_PADDING,
        				   },
            			   y: {scaleType : 'linear',
            				      domain : yDomain,
            				   axisLabel : 'Probability US 2013',
            				   topPadding: Y_AXIS_TOP_PADDING,
            				  leftPadding: Y_AXIS_LEFT_PADDING,
            			   },
            			          height : height 
                          };

		coordSysDistrib = CoordinateSystem(coordInfo);

		// Sense whether module should be docked with
		// neighbor after moving is done (mouse button released):
		
		dispatchSlotModMoveEnd.on("moved", function() {
			if ( withinDockingDistance(this) && ! dockedWith(this, "left") ) {
				// Being dragged, within docking distance,
				// and not already docked:
				this.classed("dockReady", true);
			} else {
				this.classed("dockReady", false);
			}
		})
		dispatchSlotModMoveEnd.on("moveEnd", dockIfShould);
		
		// Enable docked modules to be moved as a unit:
		dispatchMoveChainGang.on("moved", moveDockedMods);
		
		// ****dispatchSpinDone.on("allSpinsDoneOneModule", visualizeWinners);
		dispatchSpinDone.on("allSpinsDoneOneModule", function(slotModBodySel) {
			if ( didWin(slotModBodySel) ) {
				visualizeSuccess(slotModBodySel);
			}
		});
		
		dispatchSpinDone.on("allSpinsDoneAllModules", function(slotModBodySel) {
			// Get first member of this slot modules gang. The 'true'
			// includes the module itself in the gang determination:
			let chainGangLeader = getChainGangMembers(slotModBodySel, true)[0];
		
			let theOperatorArr  = getChainAndOrValues(slotModBodySel);
			let theWinSequences = chainGangWinnings[chainGangLeader]
		
			let winAnalyzer = winSequenceAnalyzer(theOperatorArr, theWinSequences);
			let won = null;
			while (! (won = winAnalyzer.next()).done ) {
				if ( won.value  ) {
					// Overall win:
					bumpScore();
				}
			}
		});

		// Generate bar chart for cause of death probabilities:
        updateDistribChart(coordSysDistrib);
        attachBarBehaviors();
	}
	
	/*---------------------------
	| updateDistribChart
	-----------------*/
	
	var updateDistribChart = function(coordSysDistrib) {
		
		let xScale = coordSysDistrib.xScale;
		let yScale = coordSysDistrib.yScale;
		let causesToInclude = coordSysDistrib.xDomain;
		
		let deathDistribTbl = null;
		
		if ( scenario === "simple" ) {
			deathDistribTbl = DEATH_CAUSES_SIMPLE;
		} else {
			deathDistribTbl = DEATH_CAUSES;
		}
				
		let barsSel = d3.select('#distribSvg').selectAll('.deathCauseBar')
			// Data are the causes of death:
   		  .data(causesToInclude)
	      		.attr('y1', function(deathCause) {
	      			return prob2Px(deathDistribTbl[deathCause]);
	      		})
	      		.attr("class", "deathCauseBar")
	      		.style("stroke-linecap", function(deathCause) {
	      			// Bars long enough to grab with mouse get straight edge top,
	      			// others get round head:
	      			if ( deathDistribTbl[deathCause] > ADD_DISTRIB_BAR_HANDLE_THRESHOLED ) {
	      				return "butt";
	      			} else {
	      				return "round";
	      			}
	      		})
	      .enter()
      		.append("line")
	      		.attr("class", "deathCauseBar") 
	      		.style("stroke-linecap", function( deathCause ) {
	      			// Bars long enough to grab with mouse get straight edge top,
	      			// others get round head:
	      			if ( deathDistribTbl[deathCause] > ADD_DISTRIB_BAR_HANDLE_THRESHOLED ) {
	      				return "butt";
	      			} else {
	      				return "round";
	      			}
	      		})
	      		.attr("id", function(deathCause) { 
	      			return 'distribBar' + deathCause.replace(/ /g, '_').replace(/'/, '');
	      		})
	      		.attr("deathCause", function(deathCause) { return deathCause })
	      		.attr("deathProb", function(deathCause)  { return deathDistribTbl[deathCause] })
	      		.attr("x1", function(deathCause) { 
	      			return xScale(deathCause) + xScale.bandwidth()/2;
	      		})
	      		.attr("x2", function(deathCause) { 
	      			return xScale(deathCause) + xScale.bandwidth()/2;
	      		})
	      		.attr("y1", function(deathCause) { 
	      			return prob2Px(deathDistribTbl[deathCause]);

	      		})
	      		.attr("y2", function(deathCause) { 
	      			return (height - X_AXIS_BOTTOM_PADDING);
	      		})
	      		.attr("stroke-width", xScale.bandwidth())
	}
	
	/*---------------------------
	| updateSlotModHistogram 
	-----------------*/
	
	var updateSlotModHistogram = function(slotModBodySel, otherModsToUpdate) {
			//deathCauseCounts, coordSys) {
		/*
		 * Given the d3 selecton of a slot module body, update the modules
		 * death cause histogram. The method uses the coordinate system and
		 * counts that are stored inside each slot module.
		 * 
		 * If otherModsToUpdate is given, it is expected to be an array
		 * of other d3 slot module body selections on which this same
		 * method is to be called. That is whose own histograms are also
		 * to be updated. If this parameter is omitted, all members in
		 * the chain gang with the given module will be updated. This method
		 * is called recursively to accomplish this task.
		 * 
		 * :param slotModBodySel: d3 selection of slot module whose histogram
		 * 		is to be updated.
		 * :type slotModBodySel: d3-sel
		 * :param otherModsToUpdate: option array of more d3 slot mod body selections
		 * 		to update as well.
		 */
		
		let coordSys = getCoordSys(slotModBodySel);
		let deathCauseCounts = slotBodies[slotModBodySel.attr("id")].deathCauseCounts;
		let counts = Object.values(deathCauseCounts)
		
		if ( typeof(otherModsToUpdate) === 'undefined' ) {
			otherModsToUpdate = getChainGangMembers(slotModBodySel);
		}
		
		// If the largest of the latest counts exceeds the
		// histogram's y-axis, then rescale the axis:
		let largestCount  = Math.max.apply(null, counts);
		let yScaleHighest = coordSys.yScale.domain()[1]; 
		if ( largestCount > yScaleHighest)  {
			coordSys.rescaleY(counts);
		}
		
		let slotModSvgSel = coordSys.svgSel;
		let xScale        = coordSys.xScale;
		let yScale        = coordSys.yScale;
		let xBandWidth    = coordSys.xBandWidth;
		let height        = coordSys.height;
				
		let barsSel = slotModSvgSel.selectAll('.slotModHistRect')
			// Data are the counts of causes of death:
   		  .data(Object.keys(deathCauseCounts))
   		  		.attr("y", function(deathCause){
   		  			return yScale(deathCauseCounts[deathCause]);
   		  		})
	      		.attr("height", function(deathCause) {
	      			return (height - coordSys.xAxisBottomPad) - yScale(deathCauseCounts[deathCause]);
	      		})
	      .enter()
     		.append("rect")
	      		.attr("class", "slotModHistRect")
	      		.attr("id", function(deathCause) { 
	      			return 'histBar' + deathCause.replace(/ /g, '_').replace(/'/, '');
	      		})
	      		.attr("deathCause", function(deathCause) { return deathCause } )
	      		.attr("x", function(deathCause) { 
	      			return xScale(deathCause);
	      		})
	      		.attr("width", xBandWidth)
	      		.attr("y", function(deathCause) { 
	      			return  yScale(deathCauseCounts[deathCause]);
	      		})
	      		.attr("height", function(deathCause) { 
	      			return (height - coordSys.xAxisBottomPad) - yScale(deathCauseCounts[deathCause]);
	      		});
		
		// Now update any chain gang members as well:
		if ( otherModsToUpdate.length > 0 ) {
			let chainGangMemberSel = otherModsToUpdate.pop();
			updateSlotModHistogram(chainGangMemberSel, otherModsToUpdate);
		}
	}
	
	/*---------------------------
	| didWin 
	-----------------*/
	
	var didWin = function(slotModBodySel) {
		/*
		 * Return true if the given slot module body's bet
		 * selector shows the same cause of death as the
		 * slot window.
		 * 
		 * In addition, all gang members, if any exist, are
		 * checked as well. The final result is the and/or
		 * combination of all chain gang members. Whether 
		 * results are and'ed or or'ed depends on the dock
		 * selectors.
		 */
		
		// Get bet placed in given slot module:
		let bettingSelectorSel = slotModBodySel.select(".bettingSelector");
		let domBettingEl = bettingSelectorSel.node();
		let currBetOptionIndx = domBettingEl.selectedIndex;
		// Get the non-abbreviated cause of death:
		let currBetTxt  = bettingSelectorSel.attr("fullDeathCause");
		
		// Get death cause currently displayed in slot window:
		let currSlotWinTxt = slotBodies[slotModBodySel.attr("id")].textManager.getCurrTxt();
		
		return currSlotWinTxt === currBetTxt;
	}
	
	
	/*---------------------------
	| barPulled
	-----------------*/
	
	var barPulled = function(distribBarSel) {
		/*
		 * Called when a cause-of-death distribution bar is dragged up or down.
		 * Updates probability in selected slot module.
		 * Note: the re-normalization of the other probabilities
		 *       happens in  
		 */
		return;
	}

	/*---------------------------
	| attachBarBehaviors
	-----------------*/
	
	var attachBarBehaviors = function() {
		
		/*
		 * For each probability distripution bar, attach
		 * tooltip-showing on mouseover, and dragging behavior.
		 */
		
		let deathDistribTbl = null;
		
		if ( scenario === "simple" ) {
			deathDistribTbl = DEATH_CAUSES_SIMPLE;
		} else {
			deathDistribTbl = DEATH_CAUSES;
		}
		
		d3.selectAll(".deathCauseBar")
		
	      	.on("mouseover", function() {
	      		let evt         = d3.event;
	      		let deathCause	= d3.select(this).attr("deathCause");

	      		tooltipTxtSel.html(deathCause + ': ' + deathDistribTbl[deathCause].toPrecision(3) + 
	      						   '<p><i>Drag me up or down</i>'
	      						   
	      		);
	      		
	      		let txtWidth  = tooltipTxtSel.node().getBoundingClientRect().width;
	      		let txtHeight = tooltipTxtSel.node().getBoundingClientRect().height;	      		

	      		let tooltipHeight = tooltipDivSel.node().getBoundingClientRect().height;
	      		tooltipDivSel
	      			.style("left", `${evt.pageX}px`)
	      			.style("top", `${evt.pageY - tooltipHeight}px`)
	      			.style("width", `${txtWidth}px`)
	      			.style("height", `${txtHeight}px`);

	      		tooltipDivSel.classed("visible", true);
	      		tooltipTxtSel.classed("visible", true);
	      		
	      		d3.timeout(function(elapsed) {
	      			tooltipDivSel.classed("visible", false);
	      			tooltipTxtSel.classed("visible", false);
	      		}, TOOLTIP_SHOW_DURATION);
	      		
	      	})
	      	.on("mouseleave", function(evt) {
	      		tooltipTxtSel.classed("visible", false);
	      		tooltipDivSel.classed("visible", false);
	      	})
				
	      	// Attach drag-start behavior to this bar.
	      	// Couldn't get a separate function to work
	      	// here: The dragstart/drag/dragend below should
	      	// be in a function that returns the behavior.
	      	// Didn't work.
	      	.call(d3.drag()
				.on("start", function(d) {
					
					// D3-select the DOM element that's trying
					// to be dragged:
					let barSel = d3.select(this);
					
					// Is the element one of our bars?
					if (barSel.attr('class') !== 'deathCauseBar') {
						// Was running mouse over something other than
						// one of our circles:
						return;
					}
					
					// Allow us to style a moving bar if we want:
					barSel.classed("dragging", true);

					// Remember the bar that's in motion:
					d3.drag.currBar = this;
					// Remember its original position so that
					// we can later re-normalize the other probs:
					d3.drag.origY    = this.y1.baseVal.value; // For rect-bars: change to "y"
					
				})
				.on("drag", function(d) {
					let barSel = d3.select(this);
					if (barSel.empty()) {
						// Not over a bar:
						return;
					} 
					
					let mouseY  = d3.event.y;
					// For rect as bars, replace y1/y2 with y:
					let barY = null
					if ( BARS_ARE_LINES ) {
						barY = barSel.attr('y');
					} else {
						barY    = barSel.attr('y1');
					}
					
					if (mouseY < barY || mouseY > height - X_AXIS_BOTTOM_PADDING) {
						// Mouse got ahead of the bar being resized.
						// Select the bar we are dragging instead:
						barSel = d3.select(d3.drag.currBar);
						if (barSel.empty()) {
							// Not over a bar:
							return;
						} 
					}
					
					if (! barSel.classed("dragging")) {
						// Not over something being dragged:
						return;
					}
					
					dragClickHandler.dragmove(barSel, BARS_ARE_LINES);
					
					// Let interested parties know that a bar was resized.
					//*****dispatchBarHeightChange.call("drag", this, barSel);
				})
				.on("end", function(d) {
					d3.select(this).classed("dragging", false);
					// Re-normalize the death cause probabilities,
					// and update all other bars. We pass the selection
					// of the bar that was raised/lowered, and the
					// amount it moved (change to "y" for rects):
					let barSel = d3.select(this);
					let deathCause = barSel.attr("deathCause");
					deathDistribTbl[deathCause] = px2Prob(d3.event.y);
					// If bar was dragged down, y increased. So the
					// following will be positive:
					normalizeDeathCauses(barSel, this.y1.baseVal.value - d3.drag.origY);
					updateDistribChart(coordSysDistrib);
					d3.drag.currBar = undefined;
					upLog(`drag_${deathCause.replace(' ', '_')}`);
				})
	      	)
	}
	
	/*---------------------------
	| setSlotWindowTxt 
	-----------------*/
	
	var setSlotWindowTxt = function(slotModBodySel, txtInfo, transitionSpeed, callback) {
		/*
		 * Set the slot window text of one slot module.
		 * Parameter txtInfo may be a string, in which case 
		 * that string is displayed. If txtInfo is instead an 
		 * array of strings, then each string is displayed in 
		 * turn. The original thought was to to use transitions
		 * to fade in one text after the other. This proved too
		 * unpredictable and irregular. So the transition speed
		 * is a delay between showing successive texts.
		 *
		 * :param slotModBodySel: d3 selection of the slot
		 * 		module body whose slot window is to receive
		 * 		the text.
		 * :param txtInfo: text to display.
		 * :type txtInfo: { string | [string] }
		 * :param transitionSpeed: relevant if multiple strings are
		 * 		be displayed in sequence. The transitionSpeed is
		 * 		the time between showing successive texts. The
		 * 		units are milliseconds.
		 * :type transitionSpeed: { number | undefined }
		 * :param callback: function to call when done.
		 * :type callback: { function | undefined }
		 */

		if ( typeof(txtInfo) === "string") {
			txtInfo = [txtInfo];
		}
		
		if ( typeof(transitionSpeed) === 'undefined' ) {
			transitionSpeed = SLOT_TXT_TRANSITION_SPEED_1;
		}
		
		if ( typeof(callback) === 'undefined') {
			callback = function() {};
		}
		
		let slotTxtMan = slotBodies[slotModBodySel.attr("id")].textManager;
		
		// If there are many text elements to display in 
		// sequence, the browser lags behind, even with
		// short transition speed settings. In that case
		// just display with small delay in between, rather 
		// than fade:
		let doFade = true;
		if ( txtInfo.length > 1 ) {
			doFade = false;
		}
		setSlotWindowTxtWorker(txtInfo, 
							   transitionSpeed, 
							   callback, 
							   slotTxtMan, 
							   doFade, 
							   0,      // nth (recursive) call
							   slotModBodySel);
	}
	
	/*---------------------------
	| 
	-----------------*/
	
	var setSlotWindowTxtWorker = function (txtInfo, 
										   transitionSpeed, 
										   callback, 
										   slotTxtMan, 
										   doFade,
										   nth,
										   slotModBodySel) {
		
			let txt = txtInfo.pop();
				
			if ( typeof(txt) === 'undefined') {
				// All done; switch the txt
				// elements:
				slotTxtMan.makeNxtHot();
				return;
			}
			
			// Prepare (i.e. compute wrapping for) text in 
			// the currently invisible text element:
			
			slotTxtMan.coldSel().text(txt);
			
			// Wrap text within slot window; padding left and right:
			wrapTxt(slotTxtMan.coldSel(), slotWinWidth, SLOT_WINDOW_LEFT_PADDING);
			
			if ( doFade ) {
				// Fade out the hot (visible) text:
				slotTxtMan.hotSel()
					.transition()
					.transition("fadeOut")
						.duration(transitionSpeed)
						.style("opacity", 0);

				// Fade in the currently invisible text element:
				slotTxtMan.coldSel()
					.transition()
					.transition("fadeIn")
						.duration(transitionSpeed)
						.style("opacity", 1)
						.on("end", function() {
							if ( typeof(callback) === 'function') {
								callback();
							}
							// Signal one spin done, passing the
							// index into the arr of texts to display
							// one after another. The slotModBodySel will
							// be bound to 'this' in listener functions:
							dispatchSpinDone.call("oneSpinDone", slotModBodySel, nth);
						});
				slotTxtMan.makeNxtHot();
			} else {
				slotTxtMan.hotSel().style("opacity", 0);
				slotTxtMan.coldSel().style("opacity", 1);
				slotTxtMan.makeNxtHot();
				d3.timeout(function() {
					// The custom callback for after each change of window text:
					callback();
					// Routine event when a new text has appeared.
					// The slotModBodySel be bound to 'this' in destination
					// listeners:
					dispatchSpinDone.call("oneSpinDone", slotModBodySel, nth);
					// Recursive call:
					setSlotWindowTxtWorker(txtInfo, 
										   transitionSpeed, 
										   callback, 
										   slotTxtMan, 
										   doFade, 
										   nth+1,
										   slotModBodySel);
				}, transitionSpeed);
			}
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
		
		d3.select(".controlButtonBar")
			.append('input')
			  .attr("type", "button")
			  .attr("id", "newSlotModule")
			  .attr("value", "Add Slot Module")
			  .attr("class", "button newSlotModule")
			  .on("click", function() {
				  createSlotModule("slotMod_" + uniqueNum());
				  upLog("createNewSlotMod");
			  });

	    // Have the navigation buttons all call goToStep()
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

		upLog(stepName);
		
		switch (stepName) {
		case 'home':
			d3.select(".button.newSlotModule")
				.classed("visible", false);
			switchScenarios("simple");
			break;
		case "step1":
			d3.select(".button.newSlotModule")
				.classed("visible", true);
			switchScenarios("simple");			
			break;
		case "step2":
			d3.select(".button.newSlotModule")
				.classed("visible", true);
			switchScenarios("complex");
			break;
//		case "step3":
//			d3.select('#machinesDiv')
//			colBtnsVisible(true);
//			break;
		case "reset":
			// Restore true cause-of-death probabilities:
			switchScenarios("simple");
			setScore(0);
			// Set all slot module's histograms to empty:
			d3.selectAll(".machinesBody")
				.each(function() {
					let slotModBodySel = d3.select(this);
					let coordSys = getCoordSys(slotModBodySel);
					// Select the outer-body rectangle:
					clearDeathCauseCount(slotModBodySel);
					coordSys.resetY();
					updateSlotModHistogram(slotModBodySel);
				});
			d3.select(".button.newSlotModule")
				.classed("visible", false);

			break;
		}
	}

	/*---------------------------
	| uniqueNum 
	-----------------*/
	
	var uniqueNum = function() {
		return (new Date).getTime() + Math.random().toString().substring(2) ;
	}
	
	
	/*---------------------------
	| normalizeDeathCauses 
	-----------------*/

	var normalizeDeathCauses = function(barSel, pixelDelta) {
		/*
		 * Without the two parameters, normalizes all probabilities
		 * in DEATH_CAUSES so they add to 1. Modifies DEATH_CAUSES values
		 * in place.
		 * 
		 * If barSel and pixelDelta are provided, the DEATH_CAUSES 
		 * probability values are assumed to have been normalized 
		 * already, but that one value was raised or lowered. 
		 * This method re-normalizes all DEATH_CAUSES probability 
		 * values, keeping constant the one that is provided. This 
		 * functionality is needed when users change the height of 
		 * a bar, changing the corresponding cause of death's probability.
		 * 
		 * All probabilities other than the user-adjusted one are adjusted
		 * to compensate for the given bar's changed height. The compensatory
		 * action is distributing across all bars other than the
		 * one given in the parameter.
		 * 
		 * :param barSel: optional: a D3 selection of a bar whose value changed
		 * :type barSel: { undefined | D3-sel }
		 * :param pixelDelta: optional: the number of pixel by which the bar moved.
		 * 		If positive, the bar moved down by pixelDelta pixels 
		 * 		(.i.e. the bar's y increased by pixelDelta).
		 * :type pixelDelta: { undefined | float }
		 * 
		 */
	
		// Table with counts (or probabilities) of death causes:
		let deathDistribTbl = null;
		
		if ( scenario === 'simple' ) {
			deathDistribTbl = DEATH_CAUSES_SIMPLE;
		} else {
			deathDistribTbl = DEATH_CAUSES;
		}
		
		if ( typeof(barSel) === 'undefined') {
			// Turn death cause percentages to probabilities:
			let normalizedProbs = normalizeProbs(Object.values(deathDistribTbl));
			let causes = Object.keys(deathDistribTbl);
			for ( let i=0; i<normalizedProbs.length; i++ ) {
				deathDistribTbl[causes[i]] = normalizedProbs[i];
			}
		} else {
			
			// Update the just-dragged bar with its new probability:
			let thisBarCause 		   = barSel.attr("deathCause");
			deathDistribTbl[thisBarCause] = px2Prob(barSel.attr("y1"));
			let newProb                = deathDistribTbl[thisBarCause];
			barSel.attr("deathProb", newProb);
				
			let currentProbs = Object.values(deathDistribTbl);
			// Blank out the user-adjusted probability:
			let currCauseIndx = Object.keys(deathDistribTbl).indexOf(thisBarCause);
			currentProbs[currCauseIndx] = 0;
			currentProbs = normalizeProbs(currentProbs, 1-newProb);
			// Put the true current prob back in:
			currentProbs[currCauseIndx] = parseFloat(barSel.attr("deathProb"));
			for ( let i=0; i<currentProbs.length; i++ ) {
				deathDistribTbl[Object.keys(deathDistribTbl)[i]] = currentProbs[i];
			}
				
			//************
			let sum = Object.values(deathDistribTbl).reduce(function(a,b) { return a+b }, 0);
			//1+1; // just a statement to attach a breakpoint to
			//console.log(`Sum = ${sum}`);
			//************

		}
		
		// Get a new event generator that is biased
		// according to the new distribution:
		eventGenerator = EventGenerator(deathDistribTbl);
	}
	
	/*---------------------------
	| createScoreBoard 
	-----------------*/
	
	var createScoreBoard = function() {

		let machinesDivSel     = d3.select("#machinesDiv");
		let machinesDivDimRect = machinesDivSel.node().getBoundingClientRect(); 
		
		let scoreBoardSel = machinesDivSel 
			.append("svg")
				.attr("class", "scoreSvg")
				.attr("id", "scoreBoardSvg")
				
		scoreBoardSel
			.append("rect")
				.attr("class", "scoreFrame")
				.attr("id", "scoreRect")
				.attr("x", "2px")
				.attr("y", "2px")

		scoreBoardSel
			.append("text")
				.attr("class", "scoreTxt")
				.attr("id", "scoreTxt")
				.attr("text-anchor", "middle")
				.attr("x", "1em")
				.attr("y", "1.4em")
				.text("");

		setScore(0);
	}
	
	/*---------------------------
	| setScore 
	-----------------*/
	
	var setScore = function(num) {
		
		let txtSel = d3.select("#scoreTxt");
		let svgSel = d3.select("#scoreBoardSvg");
		let svgDimRect = svgSel.node().getBoundingClientRect();
		txtSel.text(num);
		let scoreTxtDimRect      = txtSel.node().getBoundingClientRect();
		txtSel.attr("x", svgDimRect.width / 2.);
	}
	
	/*---------------------------
	| bumpScore 
	-----------------*/
	
	var bumpScore = function() {
		/*
		 * Convenience: increment win-counter by 1:
		 */
		
		setScore(getScore() + 1);
	}
	
	/*---------------------------
	| getScore 
	-----------------*/
	
	var getScore = function() {
		return parseInt(d3.select("#scoreTxt").text());
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
	| addInnerShadow 
	-----------------*/
	
	var addInnerShadow = function(anSvg) {
		
		var defs = anSvg.append("svg:defs");

		var inset_shadow = defs.append("svg:filter")
		.attr("id", "inset-shadow");

		inset_shadow.append("svg:feOffset")
		.attr({
			dx:0,
			dy:0
		});

		inset_shadow.append("svg:feGaussianBlur")
		.attr({
			stdDeviation:4,
			result:'offset-blur'
		});

		inset_shadow.append("svg:feComposite")
		.attr({
			operator:'out',
			in:'SourceGraphic',
			in2:'offset-blur',
			result:'inverse'
		});

		inset_shadow.append("svg:feFlood")
		.attr({
			'flood-color':'black',
			'flood-opacity':.7,
			result:'color'
		});

		inset_shadow.append("svg:feComposite")
		.attr({
			operator:'in',
			in:'color',
			in2:'inverse',
			result:'shadow'
		});

		inset_shadow.append("svg:feComposite")
		.attr({
			operator:'over',
			in:'shadow',
			in2:'SourceGraphic'
		});
		
		return anSvg;  
		
	}
	
	/*---------------------------
	| normalizeProbs 
	-----------------*/
	
	var normalizeProbs = function(probArr, normTarget) {
		/*
		 * Takes an array and returns an array
		 * in which the elements add to 1. So
		 * all elements are scaled to retain their
		 * proportions, but they add to normTarget.
		 * 
		 * :param probArr: array of numbers to processd
		 * :type probArr: [number]
		 * :param normTarget: number to which all elements are to sum.
		 *     default is 1
		 * :type normTarget: number
		 * :returns array of normalized elements.
		 * :rType: [number]
		 */
		
		if ( typeof(normTarget) === 'undefined' ) {
			normTarget = 1.0;
		}
		let sum = probArr.reduce(function(a,b) {
			return a+b;
		}, 0);

		if ( sum === 0 ) {
			// Return an array of 0.0: 
			return new Array(1+probArr.length).join('0').split('').map(parseFloat);
		}
		let normFactor = normTarget/sum;
		return probArr.map(function(el) {
			return el * normFactor;
		})
	}
	
	/*---------------------------
	| getRandomInt 
	-----------------*/
	
	/**
	 * Returns a random integer between min (inclusive) and max (inclusive)
	 * Using Math.round() will give you a non-uniform distribution!
	 */
	
	var getRandomInt = function(min, max) {
	    return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	
	/*---------------------------
	| wrapTxt
	-----------------*/

	var wrapTxt = function(txtSel, width, sidePadding) {
		/*
		 * Given a text object selection and a width in
		 * pixels, make lines fit into horizontal space by
		 * checking for line length after each word. Create
		 * a tspan for each line, and add it to the txtSel
		 * being worked on.
		 * 
		 * Overflow can still happen vertically.
		 * 
		 * :param txtSel: d3 selection of a text element
		 * :type txtSel: d3-selection
		 * :param width: pixel width of space into which text must fit
		 * :type width: { float | int }
		 * :param sidePadding: pixel distance from left edge of container. NOT WORKING!
		 * :type sidePadding: { float | int }
		 */
		
		if ( typeof (sidePadding) !== "undefined" ) {
			width -= 2*sidePadding;
		} else {
			sidePadding = 0;
		}
		
		let fontSize = parseFloat(getComputedStyle(txtSel.node()).fontSize);
		let toTxtBaseline  = fontSize + slotWinHeight / 4.
		
		txtSel.each(function() {
			var text = d3.select(this),
			// Chop text into words, and put them into
			// an array in reverse order:
			words = text.text().split(/\s+/).reverse(),
			word,
			line = [],
			lineNumber = 0,
			lineHeight = 1.1, // ems
			y = text.attr("y"),
			dy = text.attr("dy");
			
			if ( dy === null ) {
				dy = 0.0;				
			} else {
				dy = parseFloat(text.attr("dy"));
			}
			if ( y === null ) { y = "0"};

			var tspan = text.text(null)
							.append("tspan")
								.attr("x", 0)
								.attr("y", y)
								.attr("dy", dy + "em");
								
			// Construct a line by adding a word at
			// a time, and checking whether it would
			// overflow the line:
			while (word = words.pop()) {
				// Add one word to a word-array:
				line.push(word);
				// Turn it into text:
				tspan.text(line.join(" "));
				if (tspan.node().getComputedTextLength() > width) {
					// Yep, this word is one too many for this line;
					// omit the word from the line being built,
					// unless it's the only word; in that case we
					// have no choice:
					if ( line.length > 1) {
						line.pop();
						tspan.text(line.join(" "));
						// The word we couldn't fit is the first on the nxt line:
						line = [word];
					} else {
						tspan.text(line[0]);
						line = [];
					}
					// ... and create a tspan from the array of words
					// that do fit:
					
					tspan = text
							 .append("tspan")
								.attr("text-anchor", "middle")
							 	.attr("x", 0)
								.attr("y", y)
								.attr("dy", ++lineNumber * lineHeight + dy + "em")
								.attr("transform", // Center horizontally:
										`translate(${sidePadding + width / 2.}, ${toTxtBaseline})`
								)
								.text(word);
				}
			}
		});
	}
	
	/*---------------------------
	| getClassedUnderCoords
	-----------------*/
	
	var getClassedUnderCoords = function(theClass, x,y) {
		let baseRockSel = d3.select("html") 
		let elementMouseIsOverSel = d3.select(document.elementFromPoint(x, y));

		try {
			while (elementMouseIsOverSel !== baseRockSel ) {
				if ( elementMouseIsOverSel.classed(theClass) ) {
					return elementMouseIsOverSel.node();
				}
				elementMouseIsOverSel.classed("disabled", true);
				elementMouseIsOverSel = d3.select(document.elementFromPoint(x, y));
			}
		} finally {
			/* Now clean it up */
			d3.select(".disabled")
			.classed("disabled", false);
		}
	}
	
	/*---------------------------
	| px2Prob 
	-----------------*/
	
	var px2Prob = function(pixelYVal) {
		/*
		 * Given a pixel value that is assumed to be the
		 * the Y-reading in the distribution chart, return
		 * the corresponding probability. If the probability
		 * would be negative, it is returned as zero.
		 * 
		 * :param pixelYVal: the y-value to convert. If the value is
		 *     a string it will be converted to a float. Examples of
		 *     legal values: 5, -14, "30", "50.3px"
		 * :type pixelYVal: { number | string }
		 * :returns: probability, pegged to zero.
		 */
		
		if ( typeof(pixelYVal) !== "number" ) {
			pixelYVal = parseFloat(pixelYVal);
		}
		let trueY = pixelYVal
		// Don't return a negative probability
		let prob  = Math.max(coordSysDistrib.yScale.invert(trueY), 0);
		return prob;
	}
	
	/*---------------------------
	| prob2Px 
	-----------------*/
	
	var prob2Px = function(prob) {
		/*
		 * Given a probability, return the corresponding
		 * Y pixel value. If the result would have the
		 * y value dip below the X axis, the y value of
		 * the X axis is returned instead.
		 * 
		 * :param prob: the probability to convert.
		 * :type prob: number
		 * :returns: pixel value, or y-value of x-axis if
		 *     value would be larger than y-value of the x-axis. 
		 */
		let y = coordSysDistrib.yScale(prob);
		return Math.min(y, height - X_AXIS_BOTTOM_PADDING );
	}
	
	/*---------------------------
	| sumDeathCauseProbabilities 
	-----------------*/
	
	var sumDeathCauseProbabilities = function() {
		let deathDistribTbl = null;
		
		if ( scenario === "simple" ) {
			deathDistribTbl = DEATH_CAUSES_SIMPLE;
		} else {
			deathDistribTbl = DEATH_CAUSES;
		}
		
		return Object.values(deathDistribTbl).reduce(function(a,b) { return a+b }, 0);
	}
	
	/*---------------------------
	| numZeroProbs 
	-----------------*/

	var numZeroProbs = function() {
		/*
		 * Counts and returns the number of death causes that
		 * are zero. 
		 */
		let deathDistribTbl = null;
		
		if ( scenario === "simple" ) {
			deathDistribTbl = DEATH_CAUSES_SIMPLE;
		} else {
			deathDistribTbl = DEATH_CAUSES;
		}
		
		let numZeroesSoFar = 0;
		for ( let prob of Object.values(deathDistribTbl) ) {
			if ( prob === 0 ) {
				numZeroesSoFar++;
			}
		}
		return numZeroesSoFar;
	}

	/*---------------------------
	| addDeathCauseCount
	-----------------*/
	
	var addDeathCauseCount = function(slotModBodySel, deathCause) {
		/*
		 * Given the selection of a slot module body,
		 * grab its JSON-encoded death cause count object,
		 * and add 1 to the counter of key deathCause.
		 */
		
		// Probably inefficient to use JSON, but I think
		// that attrs can only be strings, and I like keeping
		// each slot module's information with the module:
		
		let deathCauseCount = slotBodies[slotModBodySel.attr("id")].deathCauseCounts
		deathCauseCount[deathCause]++;
	}
	
	/*---------------------------
	| getDeathCauseCount
	-----------------*/
	
	var getDeathCauseCount = function(slotModBodySel, deathCause) {
		/*
		 * Given a slot module body selection and a death
		 * cause, return the number of times that cause has occurred
		 * in this module.
		 */
		let deathCauseCounts = slotBodies[slotModBodySel.attr("id")].deathCauseCounts;
		return deathCauseCounts[deathCause];
	}
	
	/*---------------------------
	| clearDeathCauseCount 
	-----------------*/
	
	var clearDeathCauseCount = function(slotModBodySel) {
		/*
		 * Zeroes all the slot module's death cause counts:
		 */
		
		let deathCauseCounts = slotBodies[slotModBodySel.attr("id")].deathCauseCounts;
		for ( let deathCause of Object.keys(deathCauseCounts) ) {
			deathCauseCounts[deathCause] = 0;
		};
	}
	
	/*---------------------------
	| getCoordSys 
	-----------------*/
	
	var getCoordSys = function(slotModBodySel) {
		return slotBodies[slotModBodySel.attr("id")].coordSys
	}
	
	/*---------------------------
	| dockIfShould 
	-----------------*/
	
	var dockIfShould = function(slotModBodySel) {
		
		/*
		 * Go through each slot module, and see
		 * whether any other slot module is to its
		 * right within docking distance.
		 * 
		 * If slotModBodySel is not provided, it is
		 * assumed to be bound to 'this'. That happens
		 * when this method is called via the d3.dispatch
		 * method.
		 * 
		 */
		
		if ( typeof(slotModBodySel) === 'undefined') {
			slotModBodySel = this;
		}
		
		// No matter what, turn off the 'dock-ready' indicator
		// of the given module:
		
		slotModBodySel.classed("dockReady", false);
		
		// Go through every slot module:
		for ( let candidateSlotModId of Object.keys(slotBodies) ) {
			
			// Get selection of the candidate module whose neighbors
			// will be examined:
			let candidateSlotModBodySel = d3.select("#" + candidateSlotModId);
			
			// With whom is the candidate module currently docked,
			// either to its right or to its left?
			let currPartner = dockedWith(candidateSlotModBodySel, "right");
			if ( typeof(currPartner) !== "undefined" ) {
				// Check whether partner still in docking distance:
				if (distanceBetween(candidateSlotModBodySel, currPartner) > DOCKING_DISTANCE ) {
					// User is dragging module away to undock:
					// (Not part of UI anymore: now andOr selector
					// has an explicit undock:
					undock(candidateSlotModBodySel);
				}
				// Consider next module as left docking candidate:
				continue;
			} 
			
			let candidateRightEdge = candidateSlotModBodySel.node().getBoundingClientRect().right;
			
			// See how close the candidate's right edge is to 
			// every other slot module's left edge:
			
			let dockPartnerSel = withinDockingDistance(slotModBodySel);
			if ( typeof(dockPartnerSel) !== 'undefined') {
				dock(dockPartnerSel, slotModBodySel);
			}
		}
	}
	
	/*---------------------------
	| withinDockingDistance 
	-----------------*/
	
	var withinDockingDistance = function(slotModBodySel) {
		/*
		 * Given the d3 selection of a slot module, return
		 * the d3 selection of another module that is within
		 * docking distance. Only modules to the left of the
		 * given module are considered. If slotModBodySel is
		 * undefined, variable 'this' needs to be bound to
		 * the (selection of the) slot module being considered.
		 * 
		 * :param slotModBodySel: d3 selection to be checked
		 * 		as within docking distance of any other module.
		 * 		If undefined, 'this' is used.
		 * :type slotModBodySel: { d3-sel | undefined }
		 * :return Either the d3 selection of a module with which
		 * 		the given module is within docking distance,
		 * 		else undefined.
		 * :rtype { d3-sel | undefined }
		 */

		
		if ( typeof(slotModBodySel) === 'undefined') {
			slotModBodySel = this;
		}
		for ( let maybePartnerSlotModId of Object.keys(slotBodies) ) {

			let maybePartnerSlotModBodySel = d3.select("#" + maybePartnerSlotModId);
			if ( slotModBodySel.attr("id") ===  maybePartnerSlotModBodySel.attr("id") ) {
				// Partner is same as candidate; skip:
				continue;
			}
			let distance = distanceBetween(maybePartnerSlotModBodySel, slotModBodySel);
			if ( distance > 0 && distance <= DOCKING_DISTANCE ) {
				return maybePartnerSlotModBodySel;
			} 
		}
		return undefined;
	}
	
	/*---------------------------
	| moveDockedMods 
	-----------------*/
	
	var moveDockedMods = function(dx, dy, dragHandler) {
		/*
		 * Called whenever a slot module is dragged
		 * with the mouse. The 'this' variable will be
		 * bound to the selection of the module that was
		 * dragged. 
		 * 
		 * Finds the left-most of a docking chain that the
		 * module might be part of, and ensures that the
		 * whole chain follows the just-moved module.
		 * 
		 */
		
		// 'This' is bound to the d3-sel of the 
		// affected slot module:
		let chainGang = getChainGangMembers(this)
		
		// Now drag all the chain gang members as
		// the given module was just dragged:
		for ( let slotMod of chainGang ) {
			dragHandler.dragmove(slotMod);
		}
	}
	
	/*---------------------------
	| getChainGangMembers 
	-----------------*/
	
	var getChainGangMembers = function(slotModBodySel, includeSelf) {

		/*
		 * Given the d3 selection of a slot module, 
		 * return an array of d3 selections of all slot
		 * modules that are directly or indirectly docked
		 * to the given module on the right and left.
		 * Groups of slot modules that are connected are
		 * called 'chain gangs.' The given slotModBodySel
		 * is called the reference slot module.
		 * 
		 * NOTE: the resulting array does not include 
		 *       the given slot module body unless 
		 *       includeSelf is passed as true. This omission
		 *       is useful, for instance, when moving
		 *       a chain gang given that one of the modules
		 *       has moved.
		 *
		 * :param slotModBodySel: d3 selection of slot module whose
		 * 		chain gang is to be found.
		 * :type slotModBodySel: d3-selection
		 * :param includeSelf: whether to include the given 
		 * 		slot module in the list of gang members.
		 * 		Default: false.
		 * :type includeSelf: { bool | undefined }
		 * :returns array contains slot module selections of
		 *   	the chain gang members in the same order as
		 *   	the slots show on the screen:
		 *   		[leftmostSlot, ... ,<would-be-position of ref slot>, nextSlot, ... lastSlot]
		 *   	The returned array will have property "refModBodyIndx".
		 *   	This integer indicates the index into the result
		 *   	array at which the reference module would reside if
		 *   	it was included. 
		 */
		
		let chainGang 		 = [];
		let nextGangMember   = null;
		let connectedSlotMod = slotModBodySel;
		
		if (typeof(includeSelf) === 'undefined') {
			includeSelf = false;
		}
		
		// First, find all the modules to the left of the
		// just-moved module:
		while (( nextGangMember = dockedWith(connectedSlotMod, "left")) !== undefined ) {
			chainGang.push(nextGangMember);
			connectedSlotMod = nextGangMember;
		}
		
		// Make the order of the left-side members the same
		// as what user sees on screen:
		chainGang.reverse();

		if ( includeSelf ) {
			chainGang.push(slotModBodySel);
			// Point to the given slot:
			chainGang.refModBodyIndx = chainGang.length - 1;			
		} else {
			chainGang.refModBodyIndx = chainGang.length;
		}
		
		
		// Now everyone on the right:
		connectedSlotMod     = slotModBodySel;
		while (( nextGangMember = dockedWith(connectedSlotMod, "right")) !== undefined ) {
			chainGang.push(nextGangMember);
			connectedSlotMod = nextGangMember;
		}
		return chainGang;
	}
	
	/*---------------------------
	| getChainGangPosition 
	-----------------*/
	
	var getChainGangPosition = function(slotModBodySel, chainGang) {
		/*
		 * Given the d3 selection of a slot module, return
		 * the 0-origin position within its chain gang.
		 * 
		 * :param slotModBodySel: d3 selection of slot module whose
		 * 		position is to be found.
		 * :type slotModBodySel: d3-sel
		 * :param chainGang: optional array of chain gang members.
		 * 		If omitted, this method will construct the gang.
		 * 		NOTE: make sure that the given chain gang includes
		 * 			  the given module. I.e. pass 'true' to 
		 * 			  getChainGangMembers() when finding chainGang.
		 * :returns the integer position of the module, or undefined
		 * 		if chainGang is given, but the given slot module
		 * 		is not in the gang.
		 * :rtype: { int | undefined }
		 */
		
		if ( typeof(chainGang) === 'undefined' ) {
			// Find the gang, including the give module itself:
			chainGang = getChainGangMembers(slotModBodySel, true);
		}
		for ( let i=0; i<chainGang.length; i++ ) {
			if ( chainGang[i] === slotModBodySel ) {
				return i;
			}
		}
		return undefined;
	}
	
	/*---------------------------
	| dock 
	-----------------*/
	
	var dock = function(leftModBodySel, rightModBodySel) {
		/*
		 * Given d3 selections of two slot modules, dock them.
		 */
		
		// Top and right edges of left module
		// as strings: e.g. "88.654px":
		let leftTopEdge    = leftModBodySel.style("top");
		let leftRightEdge  = leftModBodySel.style("right");
		let rightLeftEdge  = `{parseFloat(leftRightEdge) + DOCKING_DISTANCE}px`;
		
		// Move the partner into docking position
		// next to the left module:
		rightModBodySel
			.transition()
			.duration(1000)
				// Bring left edge of right module into
				// docking distance:
				.style("left", function() {
					return rightLeftEdge;
				})
			.on("end", function() {
				// Check whether user moved a participating
				// slot module so quickly that they should no
				// longer be docked by the time the transition is done:
				if ( distanceBetween(leftModBodySel, rightModBodySel) > DOCKING_DISTANCE ) {
					// Abort the docking (likely no longer needed
					// since docking only occurs after drag is ended:
					return;
				} 
			})
		
		// Remember to whom everyone is docked:
		leftModBodySel.attr("dockedWithRight", rightModBodySel.attr("id"));
		rightModBodySel.attr("dockedWithLeft", leftModBodySel.attr("id"));
		
		// Pull out the and/or selector:
		leftModBodySel.call( showAndOrSel, leftModBodySel, true );
		
		// Bring all chaingang members to height of left module:
		let gangMemberSel = d3.selectAll(getChainGangMembers(leftModBodySel));
		gangMemberSel.each(function() {
			this.style("top", leftTopEdge);
		})
		
		upLog("dock");
		
	}
	
	/*---------------------------
	| undock 
	-----------------*/
	
	var undock = function(leftModBodySel) {
		/*
		 * Undock slot module whose d3 selection is given.
		 * OK if not currently docked.
		 * 
		 *  :param leftModBodySel: d3 selection of slot module
		 *      that is to be undocked from its neighbor.
		 *  :type leftModBodySel: d3 selection.
		 *  :return the d3 selection of the undocked partner,
		 *  	or undefined if given module was not docked.
		 *  :rtype: {d3-sel | undefined}
		 */
		
		// Retract the and/or selector DOM element:
		showAndOrSel(leftModBodySel, false);
		
		let partnerId = leftModBodySel.attr("dockedWithRight");
		
		if ( partnerId === "none" ) {
			// Given module not currently docked with someone 
			// to its right:
			return undefined;
		}
		
		leftModBodySel.attr("dockedWithRight", "none");
		
		let partnerSel = d3.select("#" + partnerId); 
		partnerSel.attr("dockedWithLeft", "none");
		
		upLog("undock");
		
		return partnerSel;
	}
	
	/*---------------------------
	| dockedWith
	-----------------*/
	
	var dockedWith = function(slotModBodySel, toWhichSide) {
		/*
		 * Returns either undefined if given slot
		 * module body is not currently docked with
		 * anyone to its right/left. Or returns the d3 
		 * selection of the partner module.
		 * 
		 * Caller gets to specify whether query is about
		 * a docked-with slot module to the right, or the left. 
		 * 
		 * :param slotModBodySel: d3 selection of slot module to check.
		 * :type slotModBodySel: d3-selection.
		 * :param toWhichSide: optional. If set to "right" the method checks
		 * 		whether a slot module is docked to another module on 
		 * 		its right. If set to "left", checks whether slot module
		 * 		is docked to another module on its left. Default: "right".
		 * :type toWhichSide: { "right" | "left" | undefined }
		 * :returns Either undefined if no slot module is docked on the specified
		 * 		side. Else returns the d3 selection of that slot module body.
		 * :rtype { undefined | d3-sel }
		 */
	
		if ( typeof(toWhichSide) === 'undefined' ) {
			toWhichSide = "right";
		}
		let dockedPartnerId = null;
		
		if ( toWhichSide === "right" ) {
			dockedPartnerId = slotModBodySel.attr("dockedWithRight");
		} else {
			dockedPartnerId = slotModBodySel.attr("dockedWithLeft");
		}
		if ( typeof(dockedPartnerId) === 'undefined' || 
					dockedPartnerId  === "none" ||
					dockedPartnerId  === null) {
			return undefined;
		}
		
		return d3.select("#" + dockedPartnerId);
	}
	
	
	/*---------------------------
	| visualizeSuccess 
	-----------------*/
	
	var visualizeSuccess = function(slotModBodySel) {
		/*
		 * Modifies the given slot module's visual presentation
		 * temporarily to indicate that it won a bet. Return
		 * to normal visualization is scheduled. Caller need
		 * not worry about it.
		 */
		
		slotModBodySel
			// Change background to red gradient:
			.style("background", "linear-gradient(rgb(255,48,25), rgb(207,4,4)");

		// And schedule return to default background:
		d3.timeout(function() {
			slotModBodySel.style("background", slotModBodySel.attr("defaultBackgroundDeco")) 
		}, SUCCESS_COLOR_DURATION);
	}

	/*---------------------------
	| visualizeOverallSuccess 
	-----------------*/
	
	var visualizeOverallSuccess = function() {
		bumpScore();
	}
	
	/*---------------------------
	| checkOverallWin 
	-----------------*/
	
	var checkOverallWin = function(slotModBodySel) {
		/*
		 * Given a d3 slot module selection, determine
		 * the chain gang of which the module is a part.
		 * Examine the "and"/"or" values of the gang
		 * connectors. Return true if the gang as a whole
		 * is in a winning state. 
		 */
		
		// Get all members of a chain gang, incl.
		// the given module itself. All in the proper
		// sequence as user sees the slots left to right.
		let gang = getChainGangMembers(slotModBodySel, true);
		
		let thisWon;
		let dockBool;
		
		while ( typeof(slotModBodySel) !== 'undefined' ) {
			// Did this module win?
			thisWon  = didWin(slotModBodySel);
			// Is this module docked to the right 
			// with and AND? Or with an OR? Note:
			// if current module is the last
			// module in a chain (i.e. dockBool() returns
			// undefined, we catch it in the 'thisWon' IF
			// below:
			dockBool = getAndOrValue(slotModBodySel);
			
			if ( thisWon && (dockBool === "OR") ) {
				// The last in an AND-sequence won.
				// Everything to the right is immaterial.
				// Overall win:
				return true;
			}

			if ( thisWon ) {
				// Curr slot is in an AND sequence, and it won.
				// Check whether the next module also won:
				slotModBodySel = dockedWith(slotModBodySel, "right");
				if ( typeof(slotModBodySel) === 'undefined' ) {
					return true; // checked all gang members.
				}
			} else {
				// Abandon all AND-connected modules on the 
				// right. Continue with the first OR-connected module:
				slotModBodySel = skipToOr(slotModBodySel);
			}
		}
		return false;
	}
	
	/*---------------------------
	| skipToOr 
	-----------------*/
	
	var skipToOr = function(slotModBodySel) {
		/*
		 * Assumes given slot module is part of a
		 * chain gang. Moves along that chain left to
		 * right, starting with the given module.
		 * Proceeds until a module is right-connected
		 * via an OR (rather than an AND). Returns the
		 * d3 selection of the right-side module. I.e.
		 * the module that is the first in an OR sequence.
		 * 
		 * :param slotModBodySel: d3 selection of slot module
		 * 		whose right-side chain members are to be examined
		 * 		till an OR-dock is found.
		 * :type slotModBodySel: d3-selection
		 * :return first slot module to the right of an OR. Undefined
		 * 		if none is found.
		 * :rtype: { d3-sel | undefined }
		 * :
		 */
		
		let rightPartnerSel = undefined;

		// Get module docked to the right:
		while ( typeof((rightPartnerSel = dockedWith(slotModBodySel))) !== 'undefined' ) {

			// Is the module docked via an OR?
			if ( getAndOrValue(slotModBodySel).toUpperCase() === "OR" ) {
				return rightPartnerSel;  // Found it
			}
			// Continue from the right-side-docked module:
			slotModBodySel = rightPartnerSel;
		}
		return undefined;
	}
	
	
	/*---------------------------
	| winSequenceAnalyzer 
	-----------------*/
	
	function* winSequenceAnalyzer(theOperatorArr, theWinSequences) {
		/*
		 * Generator that takes a sequence of "and" and "or" operators, and
		 * a sequence of win/lose arrays coded as 1/0. Combines
		 * the sequence using the operators.
		 *   let theOperatorArr  = ["and", "and", "or", "and"];
		 * will return 0,1,1,0 on successive calls to next()
		 * if given the following sequences of win/lose: 
		 * 
		 *	 let theWinSequences = [ 
		 *          [1,0,0,1,0],
		 *	        [1,1,0,1,1],
		 *			[1,1,1,0,0],
		 *			[0,1,1,0,0]
		 *			]
		 *
		 * The process for the first sequence would be:
		 *    1 AND 0 AND 0 OR 1 AND 0 
		 *
		 * Given instead the operator sequence: ["and", "and", "or", "and"]
		 * the results will be 1,1,1,1
		 * 
		 * Usage example:
		 * 	  let theOperatorArr  = ["and", "and", "or", "and"]; // -> 0,1,1,0
		 *	  let theWinSequences = [ 
		 *	                          [1,0,0,1,0],
		 *	  	                    [1,1,0,1,1],
		 *	  						[1,1,1,0,0],
		 *	  						[0,1,1,0,0]
		 *	  						]
		 *	  let it = null;
		 *	  
		 *	  it = winSequenceAnalyzer(theOperatorArr, theWinSequences);
		 *	  while ( true ) {
		 *	  	let win = it.next();
		 *	  	if (win.done) {
		 *	  		break;
		 *	  	}
		 *	  	console.log(win.value);
		 *	  }
		 *	  
		 * 
		 * :param theOperatorArr: array of operators to put between
		 * 		the successive win/lose pairs.
		 * :type theOperatorArr: [string]
		 * :param theWinSequences: sequence of win/lose streaks coded as
		 * 		1===win, 0===lose
		 * 
		 * :returns on each call to next(), returns an object with two
		 * 		properties: 'value', which will be 1 or 0, representing
		 * 					    the overall win or lose of one sequence.
		 * 					'done', which will be true or false, depending
		 * 					on whether more sequences are left to process.
		 * :rtype: {'done' : bool,
		 * 			'value': integer}
		 */


		// Copy the value sequences to not modify them
		// on the caller:
		let winSequences = [];
		for ( let seq of theWinSequences ) {
			winSequences.push(seq.slice());
		}

		for ( let winSequence of winSequences ) {
			// Copy of operator array:
			let operatorArray    = theOperatorArr.slice();
			let prevCompositeRes = winSequence.shift();

			while ( operatorArray.length > 0 ) {
				let operator = operatorArray.shift();		  
				if ( operator === "or" && prevCompositeRes ) {
					// End of an AND sequence that's true,
					// followed by an OR; rest immaterial:
					operatorArray = [];
					continue; // gets out of loop
				};

				if ( operator === "and" ) {
					prevCompositeRes = prevCompositeRes && winSequence.shift();
				} else {
					prevCompositeRes = prevCompositeRes || winSequence.shift();
					if ( ! prevCompositeRes ) {
						// Had an OR and failed: move past the OR,
						// and keep trying:
						prevCompositeRes = winSequence.shift();
						continue;
					}
				}

				if ( ! prevCompositeRes ) {
					// AND series failed. Find next OR:
					while ( operatorArray.length > 0 ) {
						operator = operatorArray.shift();
						if ( operator === 'or' ) {
							break;
						}
						winSequence.shift();
					};
					// Found an OR, or ran out of operators:
					if ( operatorArray.length === 0 ) {
						// Game over:
						break; // next window sequence.
					}
					prevCompositeRes = winSequence.shift();
					continue;
				} else {
					// In an AND series, and still true
					continue; // while ( operatorArray.length > 0 )
				}
			};
			// Finished applying all operators:
			yield prevCompositeRes;
		} // end outer for.
	}
	
	/*---------------------------
	| partial 
	-----------------*/

	var partial = function(func /*, 0..n args */) {
		/*
		 * Create a new function 'g()' that calls a given
		 * function 'f(a,b,...)' with reset arguments:
		 * 
		 *   To use:
		 *        f = function(a,b,c) { return a+b+c }
		 *        f(1,2,3) --> 6
		 *   
		 *        g = partial(f, 10,20,30)
		 *        g() --> 60
		 */
		var args = Array.prototype.slice.call(arguments, 1);
		return function() {
			var allArguments = args.concat(Array.prototype.slice.call(arguments));
			return func.apply(this, allArguments);
		};
	}
	
	/*---------------------------
	| distanceBetween 
	-----------------*/
	
	var distanceBetween = function(leftSlotModSel, rightSlotModSel) {
		/*
		 * Returns horizontal distance between
		 * the right edge of the d3-selected leftSlotModSel
		 * and the left edge of the d3-selected rightSlotModSel.
		 * 
		 * :param leftSlotModSel: d3-selection of slot module that is
		 * 		assumed by the caller to be to the left of the other module.
		 * :type leftSlotModSel: d3-selection
		 * :param rightSlotModSel: d3-selection of slot module that is
		 * 		assumed by the caller to be to the right of the other module.
		 * :type rightSlotModSel: d3-selection 
		 */
		
		let leftDimRect  = leftSlotModSel.node().getBoundingClientRect();
		let rightDimRect = rightSlotModSel.node().getBoundingClientRect();
		return rightDimRect.left - leftDimRect.right; 
	}
	
	/*---------------------------
	| upLog 
	-----------------*/
	
	var upLog = function( txt ) {
		/*
		 *  Convenience method for logging.
		 *  The 'up' stands for "up-to-the-server".
		 */
		logger.log(txt);
	}
	
	return constructor(width, height);
}

/* ----------------------------------  TextManager Class ---------------------*/

var TextManager = function(txtElements) {
	
	/*
	 * Simple management of multiple DOM text
	 * elements. A usual scenario is text
	 * elements in the same position on screen
	 * that each hold different text, and of
	 * which only one is ever visible.
	 * 
	 */
	
	var hotElementIndx = 0;
	var txtSels = [];
	
	/*---------------------------
	| constructor
	-----------------*/
	
	var constructor = function(txtElements) {

		if ( typeof(txtElements) !== 'undefined') {

			for ( let el of txtElements ) {
				addTxtElement(el);
			}
		}

		return { 
			getCurrTxt    : getCurrTxt,
			getPrevTxt    : getPrevTxt,
			hotSel        : hotSel,
			coldSel       : coldSel,
			makeNxtHot    : makeNxtHot,
			addTxtElement : addTxtElement
		}
	}
	
	/*---------------------------
	| getCurrTxt 
	-----------------*/
	
	var getCurrTxt = function() {
		
		// The slot window text is a NodeList object
		// that contains tspan elements. Each of those
		// contains one line. Get those tspans and convert
		// the NodeList to an array for easier handling.
		
		let currVisible = null;
		if ( hotSel().style("opacity") === "1" ) {
			currVisible = hotSel();
		} else {
			currVisible = coldSel();
		}
		
		let tspans = Array.from(currVisible.node().childNodes);
		// First line without a leading space:
		let txt = tspans[0].textContent;
		
		// Append rest of lines:
		for ( let tspan of tspans.slice(1) ) {
			txt += ' ' + tspan.textContent;
		}
		return txt;
	}
	
	/*---------------------------
	| getPrevTxt 
	-----------------*/
	
	var getPrevTxt = function() {
		
		// The slot window text is a NodeList object
		// that contains tspan elements. Each of those
		// contains one line. Get those tspans and convert
		// the NodeList to an array for easier handling.

//		let tspans = Array.from(coldSel().node().childNodes);
//		
//		// First line without a leading space:
//		let txt = tspans[0].textContent;
//		
//		// Append rest of lines:
//		for ( let tspan of tspans.slice(1) ) {
//			txt += ' ' + tspan.textContent;
//		}
//		return txt;
	}
	
	/*---------------------------
	| hotSel 
	-----------------*/
	
	var hotSel = function() {
		return txtSels[hotElementIndx];
	}
	
	/*---------------------------
	| coldSel
	-----------------*/
	
	var coldSel = function() {
		return txtSels[(hotElementIndx + 1) % txtSels.length];
	}
	
	/*---------------------------
	| makeNxtHot 
	-----------------*/
	
	var makeNxtHot = function() {
		hotElementIndx = (hotElementIndx + 1) % txtSels.length;
	}
	
	/*---------------------------
	| addTxtElement
	-----------------*/
	
	var addTxtElement = function(txtEl) {
		txtSels.push(d3.select(txtEl));
	}
	
	return constructor(txtElements);
}

var probViz = ProbabilityViz(400, 500);


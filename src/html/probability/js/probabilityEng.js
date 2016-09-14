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
	var slotWinWidth  	 = null;
	var slotWinHeight 	 = null;
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
	var SLOT_WINDOW_X             = 4;
	var SLOT_WINDOW_Y             = 4;
	// Percentage window size of module body height
	var SLOT_WINDOW_HEIGHT_PERC   = 40/100;
	// Percentage of button height of module body height:
	var BUTTON_HEIGHT_PERC        = 10/100;
	// Percentage of top veneer height of module body height:
	var VENEER_HEIGHT_PERC        = 5/100;
	// Between slot window and go button:
	var GO_BUTTON_TOP_GAP         = 30;
	// Padding between slot window text and the left
	// edge of the slot window:
	var SLOT_WINDOW_LEFT_PADDING  = 4;

	// Percentages of total deaths in 2013. This is an
	// excerpt of all death causes. The numbers are converted
	// to normalized probabilities in the constructor:
	let DEATH_CAUSES = {
			"Athero sclerotic heart disease" : 0.0778452,
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
			"Jumping or lying before moving object" : 0.0001444,
			"Bicycle accident" : 0.0000718,
			"Explosion of other materials" : 0.0000541,
			"Furuncle and carbuncle of buttock" : 0.0000072
	};			
	
	
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
		
		// Turn death cause percentages to probabilities:
		let normalizedProbs = normalizeProbs(Object.values(DEATH_CAUSES));
		let causes = Object.keys(DEATH_CAUSES);
		for ( let i=0; i<normalizedProbs.length; i++ ) {
			DEATH_CAUSES[causes[i]] = normalizedProbs[i];
		}

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
		
		// Add the window for the text.
		// Embed in its own svg to see whether
		// we can figure out an inner shadow later:
		let slotWindowSvg = thisMachineSvg
			.append("svg")
			   //.style("width", "90%")
			   //.style("height", "40%")
			   .attr("class", "slotWindowSvg")
		slotWindowSvg
			.append("rect")
			   .attr("x", SLOT_WINDOW_X)
			   .attr("y", SLOT_WINDOW_Y)
			   .attr("width", MACHINE_BODY_WIDTH - 2*SLOT_WINDOW_X)
			   .attr("height", MACHINE_BODY_HEIGHT * SLOT_WINDOW_HEIGHT_PERC) // 40% of module body.
			   .attr("class", "slotWindowRect")

		// Gray border at top of module:
		let topVeneer = thisMachineSvg
			.append("rect")
			   .attr("x", SLOT_WINDOW_X)
			   .attr("y", SLOT_WINDOW_Y)
			   .attr("width", MACHINE_BODY_WIDTH - 2*SLOT_WINDOW_X)
			   .attr("height", MACHINE_BODY_HEIGHT * VENEER_HEIGHT_PERC)
			   .attr("class", "topVeneer");
		
			   
  	    // Add text to the slot window:
		slotWinHeight  = parseInt(slotWindowSvg.select(".slotWindowRect").attr("height"));
		slotWinWidth   = parseInt(slotWindowSvg.select(".slotWindowRect").attr("width"));
		let veneerHeight   = parseInt(topVeneer.attr("height"));
		let toHalfSlotWinY = veneerHeight + (slotWinHeight - veneerHeight) / 2.
		let toQuarterSlotWinY = veneerHeight + (slotWinHeight - veneerHeight) / 4.
		slotWindowSvg
			.append("text")
				.text("Foo")
				.attr("class", "slotWindowTxt")
				.attr("transform", 
					  `translate(${slotWinWidth / 2.}, ${toQuarterSlotWinY})`
						)
			   
		// addInnerShadow(slotWindowSvg);
			
		let goButton = thisMachineSvg
			.append("rect")
			   .attr("x", SLOT_WINDOW_X)
			   .attr("y", SLOT_WINDOW_Y + 
					   	  MACHINE_BODY_HEIGHT * SLOT_WINDOW_HEIGHT_PERC +
					   	  GO_BUTTON_TOP_GAP
					   	  )
			   .attr("width", MACHINE_BODY_WIDTH - 2*SLOT_WINDOW_X)
			   .attr("height", MACHINE_BODY_HEIGHT * BUTTON_HEIGHT_PERC)
			   .attr("class", "goButton")
			   .on("click", function(evt) {
				   let deathCauses = Object.keys(DEATH_CAUSES);
				   setSlotWindowTxt(deathCauses[getRandomInt(0,deathCauses.length)]);
			   });
		
		let goText = thisMachineSvg
		    .append("text")
		    	.text("Go")
		    	.attr("class", "goText")
		    	.attr("x", MACHINE_BODY_WIDTH / 2.)
		    	.attr("y",SLOT_WINDOW_Y + 
					   	  MACHINE_BODY_HEIGHT * SLOT_WINDOW_HEIGHT_PERC +
					   	  GO_BUTTON_TOP_GAP +            // vert middle of Go button:
					   	  MACHINE_BODY_HEIGHT * BUTTON_HEIGHT_PERC / 2.
		    	)
			    .attr("dy", ".35em");
		
	}
	
	/*---------------------------
	| setSlotWindowTxt 
	-----------------*/
	
	var setSlotWindowTxt = function(txt) {
		
		let txtSel = d3.select(".slotWindowTxt");
		txtSel.text(txt);
		// Wrap text within slot window; padding left and right:
		wrapTxt(txtSel, slotWinWidth, SLOT_WINDOW_LEFT_PADDING);
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
	
	var normalizeProbs = function(probArr) {
		/*
		 * Takes an array and returns an array
		 * in which the elements add to 1. So
		 * all elements are scaled to retain their
		 * proportions, but they add to 1.
		 */
		
		let sum = probArr.reduce(function(a,b) {
			return a+b;
		}, 0);
		if ( sum === 0 ) {
			return new Array(1+probArr.length).join('0').split('').map(parseFloat);
		}
		let normFactor = 1/sum;
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
		 * checking for line length after each word.
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
		sidePadding = sidePadding.toString();
		txtSel.each(function() {
			var text = d3.select(this),
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

			var tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
			while (word = words.pop()) {
				line.push(word);
				tspan.text(line.join(" "));
				if (tspan.node().getComputedTextLength() > width) {
					line.pop();
					tspan.text(line.join(" "));
					line = [word];
					tspan = text
							 .append("tspan")
								.attr("x", sidePadding)
								.attr("y", y)
								.attr("dy", ++lineNumber * lineHeight + dy + "em")
								.attr("text-anchor", "middle")
								.text(word);
				}
			}
		});
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


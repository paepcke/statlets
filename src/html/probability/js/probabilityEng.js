import { EventGenerator } from "./biasedEventGenerator";
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
	
	var tooltipDivSel    = null;
	var tooltipTxtSel	 = null;
	
	var scalesDistrib    = null;
	var distribCauses    = null;
	
	var browserType      = null;
	var alerter          = null;
	var logger           = null;
	var cookieMonster    = null;
	
	var machinesSvg      = null;
	var distribSvg       = null;
	
	var eventGenerator   = null;
	
	var selectedSlotModules = [];
	
	// Constants
	
	const BARS_ARE_LINES              = true;
	
	const X_AXIS_LEFT_PADDING         = 0;  // X axis distance left SVG edge
	const X_AXIS_BOTTOM_PADDING       = 70; // X axis distance bottom SVG edge
	const X_AXIS_RIGHT_PADDING        = 50; // X axis distance right SVG edge
	const Y_AXIS_BOTTOM_PADDING       = 80; // Y axis distance from SVG bottom
	//******const Y_AXIS_TOP_PADDING          = 10; // Y axis distance from SVG top
	const Y_AXIS_TOP_PADDING          = -5; // Y axis distance from SVG top
	const Y_AXIS_LEFT_PADDING   	  = 50; // Y axis distance from left SVG edge
	
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
	
	var constructor = function(width, height) {

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
		
		normalizeDeathCauses();
		let machinesDiv = document.getElementById('machinesDiv');
			
		//******width  = machinesDiv.clientWidth;
		//******height = machinesDiv.clientHeight;
		
		//*************
		//height = 400;
		//*************			
		

		// The "+40" is a kludge! It accounts
		// for the additional space that the x-axis
		// labels will take once they are rotated
		// 45 degrees: 
//		d3.select('#machinesDiv')
//			//*****.style("height", height + 40)
//			.attr("height", "100%")
					
		machinesSvg = d3.select("#machinesDiv").append("svg")
			.attr("width", "100%")
			.attr("height", "100%")
			.attr("id", "machinesSvg")
			.attr("class", "machinesSvg")
		
//		if (browserType === 'Firefox1+') {
//			machinesSvg.attr("viewBox", `0 -60 ${width} 600`);
//		} else {
//			machinesSvg.attr("viewBox", `0 -60 ${width} 600`);
//		}
		
		distribSvg = d3.select("#distribDiv").append("svg")
		   .attr("width", "100%")
		   .attr("height", "100%")
		   .attr("id", "distribSvg")
		   .attr("class", "distribSvg")
		
//		if (browserType === 'Firefox1+') {
//			distribSvg.attr("viewBox", `0 -60 ${width} 600`);
//		} else {
//			distribSvg.attr("viewBox", `0 -60 ${width} 600`); //****
//		}

		eventGenerator = EventGenerator(DEATH_CAUSES);
		createSlotModuleWell();
		createCauseDistrib();
		createTooltip() 
        addControlButtons();
		
		return {}
	}
	
	/*---------------------------
	| createTooltip 
	-----------------*/
	
	var createTooltip = function() {
		
		// Define the div for the tooltip
		
		tooltipDivSel = d3.select("body")
							.append("div")	
							   .attr("class", "div tooltip");
		tooltipTxtSel = tooltipDivSel					   
						.append("text")
						  .attr("class", "div tooltip state")
						  .text("");
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

		let thisMachineSvg = machinesSvg
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
				   setSlotWindowTxt(eventGenerator.next());
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
	| createCauseDistrib
	-----------------*/
	
	var createCauseDistrib = function() {
		
		let distribDiv = document.getElementById('distribDiv');
			
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
		
        yDomain      = [0, Math.max.apply(null, Object.values(DEATH_CAUSES))];
        xDomain      = Object.keys(DEATH_CAUSES);
        
        // Remember original samples for resetting (via reset button):
        xDomainSaved = xDomain.map(function(el) { return el });
        
        // Argument for makeCoordSys:
        let extentDict  = {svg           : distribSvg, 
        				   x: {scaleType : 'ordinal',
        					   domain    : xDomain,
        					   axisLabel : 'Cause of Death Probabilities',
        					 axisLabelId : 'distribXLabel',
        					 axisGrpName : 'distribXAxisGrp'
            				  },
            			   y: {scaleType : 'linear',
            				      domain : yDomain,
            				   axisLabel : 'Probability US 2013',
            			     axisLabelId : 'distribYLabel',
            			     axisGrpName : 'distribYAxisGrp'            			    	 
            			      }
                          };

		scalesDistrib = makeCoordSys(extentDict);
		// Generate bar chart for cause of death probabilities:
        updateDistribChart(DEATH_CAUSES, scalesDistrib);
        //*******
        // Redraw the axes so that the rounded butts of
        // the bars are behind the X-axis:
		scalesDistrib = makeCoordSys(extentDict);
		//*******
	}
	
	/*---------------------------
	| updateDistribChart
	-----------------*/
	
	var updateDistribChart = function(deathCauseObj, scalesDistrib) {
		
		let xScale = scalesDistrib.xScale;
		let yScale = scalesDistrib.yScale;
		let causesToInclude = xDomain;
		
		// Get function barPulled() 
		// a chance to see which bar moved, and to mirror
		// on the confidence interval chart:
		let dispatch = d3.dispatch('drag', barPulled);
		dispatch.on("drag.deathCauseBar", barPulled);
				
		let barsSel = d3.select('#distribSvg').selectAll('.deathCauseBar')
			// Data are the causes of death:
   		  .data(causesToInclude)
	      .enter()
      		.append("line")
	      		.attr('class', 'deathCauseBar')
	      		.attr('id', function(deathCause) { 
	      			return 'distribBar' + deathCause.replace(/ /g, '_').replace(/'/, '');
	      		})
	      		.attr('deathCause', function(deathCause) { return deathCause } )
	      		.attr('x1', function(deathCause) { 
	      			return xScale(deathCause) + xScale.bandwidth()/2;
	      		})
	      		.attr('x2', function(deathCause) { 
	      			return xScale(deathCause) + xScale.bandwidth()/2;
	      		})
	      		.attr('y1', function(deathCause) { 
	      			return yScale(deathCauseObj[deathCause]) + Y_AXIS_TOP_PADDING;

	      		})
	      		.attr('y2', function(deathCause) { 
	      			//return (height - Y_AXIS_BOTTOM_PADDING) - yScale(deathCauseObj[deathCause])
	      			return (height - X_AXIS_BOTTOM_PADDING);
	      		})
	      		.attr("stroke-width", xScale.bandwidth())
		
//	      	// This commented-out part creates rects for bars instead
//			// of the above lines with rounded butts:
//     		.append("rect")
//	      		.attr('class', 'deathCauseBar')
//	      		.attr('id', function(deathCause) { 
//	      			return 'distribBar' + deathCause.replace(/ /g, '_').replace(/'/, '');
//	      		})
//	      		.attr('deathCause', function(deathCause) { return deathCause } )
//	      		.attr('x', function(deathCause) { 
//	      			return xScale(deathCause) 
//	      		})
//	      		.attr('width', Xscale.Bandwidth())
//	      		.attr('y', function(deathCause) { 
//	      			return yScale(deathCauseObj[deathCause]) + Y_AXIS_TOP_PADDING 
//	      		})
//	      		.attr('height', function(deathCause) { 
//	      			return (height - Y_AXIS_BOTTOM_PADDING) - yScale(deathCauseObj[deathCause]) 
//	      		});


	      	.on("mouseover", function() {
	      		let evt         = d3.event;
	      		let deathCause	= d3.select(this).attr("deathCause");

	      		tooltipTxtSel.html(deathCause + '<p><i>Drag me up or down</i>');
	      		let txtWidth  = tooltipTxtSel.node().getBoundingClientRect().width;
	      		let txtHeight = tooltipTxtSel.node().getBoundingClientRect().height;	      		

	      		let tooltipHeight = tooltipDivSel.node().getBoundingClientRect().height;
	      		tooltipDivSel.style("left", `${evt.pageX}px`)
	      		.style("top", `${evt.pageY - tooltipHeight}px`)
	      		.style("width", txtWidth)
	      		.style("height", txtHeight);

	      		tooltipDivSel.classed("visible", true);
	      		tooltipTxtSel.classed("visible", true);
	      		
	      		d3.timeout(function(elapsed) {
	      			tooltipDivSel.classed("visible", false);
	      			tooltipTxtSel.classed("visible", false);
	      		}, 1000);
	      		
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
				.on('start', function(d) {
					
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
					
				})
				.on('drag', function(d) {
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
					// Used to sync (synchronize) CI chart with data chart:
					//******dispatch.drag(this, barSel);
					dispatch.call("drag", this, barSel);
				})
				.on ('end', function(d) {
					d3.select(this).classed("dragging", false);
					d3.drag.currBar = undefined;
					log("dragDeathCause")
				})
	      	)
	}
	
	
	/*---------------------------
	| barPulled
	-----------------*/
	
	var barPulled = function(distribBarSel) {
		/*
		 * Called when a cause-of-death distribution bar is dragged up or down.
		 * Updates probabilities in selected slot module.
		 */
		
		let deathCause = distribBarSel.attr("deathCause");
		let deathProb  = scalesDistrib.yScale.invert(distribBarSel.attr('y') - Y_AXIS_TOP_PADDING); 
		DEATH_CAUSES[deathCause] = deathProb;
		normalizeDeathCauses();
		updateDistribChart(DEATH_CAUSES, scalesDistrib);
		
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
			d3.select("#machinesDiv")
			colBtnsVisible(false);
			break;
//		case "step1":
//			d3.select('#machinesDiv')
//			colBtnsVisible(true);
//			break;
//		case "step2":
//			d3.select('#machinesDiv')
//			colBtnsVisible(true);
//			break;
//		case "step3":
//			d3.select('#machinesDiv')
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
	| makeCoordSys 
	-----------------*/
	
	var makeCoordSys = function(extentDict) {
		
		/*
		 * :param extentDict:
		 *  	extentDict: {
		 *  	               x : {scaleType    : <linear | ordinal | time> },
		 *  	                       domain    : <[min,max]>                   // if linear scale
		 *  	                       domain    : <[ord1,ord2,...]>             // if ordinal scale
		 *  	                     axisLabelId : <axis description>
		 *  	                       subclass  : <additionalClass>             // optional
		 *  						 rightPadding: <padding-right px>            // optional
		 *  						 axisGrpName : <ID for axis group>           // optional
		 *  	                   },
		 *  	               y : {scaleType    : <linear | ordinal | time> },
		 *  	                       domain    : <[min,max]>                   // if linear scale
		 *  	                       domain    : <[ord1,ord2,...]>             // if ordinal scale
		 *  	                     axisLabelId : <axis description>
		 *  	                       subclass  : <additionalClass>             // optional
		 *  						 axisGrpName : <ID for axis group>           // optional
		 *  	            }
		 *      Notes:
		 *          o <axis description> is the label for an axis is a
		 *            whole, i.e. not the tick labels.
		 *          o <additionalClass>, if present, will be used to
		 *            class the axis *in addition to* class "axis".
		 *            Example: <additionalClass> == 'noTicks' will 
		 *                     cause the axis to be of CSS class axis.noTicks.
		 *                     
		 * Returns an object with three properties: xScale, yScale,
		 * and bandWidth, the width in pixels between two x-axis ticks.
		 * 
		 */
		
		/* ---------------------------- X AXIS ---------------------------- */		

		let svg = extentDict.svg;
		let yAxis     = null;
		let xScale    = null;
		let yScale    = null;
		let bandWidth = null; // width in pixels between two x-axis ticks.

		let X_AXIS_RIGHT = X_AXIS_RIGHT_PADDING;
		
		if (typeof(extentDict.x.rightPadding) !== 'undefined') {
			X_AXIS_RIGHT = extentDict.x.rightPadding; 
		}
		
		// X Scale:
		
		switch(extentDict.x.scaleType) {
		case 'linear':
			xScale = d3.scaleLinear()
							 .domain(extentDict.x.domain)
							 .range([Y_AXIS_LEFT_PADDING, width - X_AXIS_RIGHT]);
			break;
		case 'ordinal':
			xScale = d3.scaleBand()
							 .domain(extentDict.x.domain)
							 .rangeRound([Y_AXIS_LEFT_PADDING, width - X_AXIS_RIGHT])
							 .paddingInner(0.1);
							 
			// Width between two ticks is (for instance) pixel-pos
			// at first domain value minus pixel pos at zeroeth domain
			// value:
			bandWidth = xScale(extentDict.x.domain[1]) - xScale(extentDict.x.domain[0]) 

		break;
		default:
			throw `Axis type ${extentDict.x.scaleType} not implemented.}`;
		}
		

		// Y Scale
		switch(extentDict.y.scaleType) {
		case 'linear':
			yScale = d3.scaleLinear()	
			 			 .domain(extentDict.y.domain)
						 .range([height - Y_AXIS_BOTTOM_PADDING, Y_AXIS_TOP_PADDING]);
			break;
		case 'ordinal':
			yScale = d3.scaleBand()
							 .domain(extentDict.y.domain)
							 .range([Y_AXIS_TOP_PADDING, height- Y_AXIS_BOTTOM_PADDING])
							 .innerPadding(0.1);
			break;
		default:
			throw `Axis type ${extentDict.x.scaleType} not implemented.}`;
		}
		
		// Make the visual coordinate system:
		
		// Create a group, and call the xAxis function to create the axis.
		let xAxisGroup = distribSvg.append("g")
			 .attr("class", "axis")
			 .attr("id", "xAxisGrp")
			 .attr("transform", `translate(${X_AXIS_LEFT_PADDING}, ${height - X_AXIS_BOTTOM_PADDING})`)
			 .call(d3.axisBottom(xScale));
		
		//xAxis = d3.select("#xAxisGrp .*******)
		   
		if (typeof(extentDict.x.subclass) !== 'undefined' ) {
			xAxisGroup.classed(extentDict.x.subclass, true)
		}
		
		if (typeof(extentDict.x.axisGrpName) !== 'undefined') {
			xAxisGroup.attr('id', extentDict.x.axisGrpName);
		}
		
		// For ordinal X-axes: rotate tick labels by 45%
		// and move them to center between x-axis ticks:
		if (extentDict.x.scaleType == 'ordinal') {
			
			// Find distance between X-ticks;
			// xScale.range() returns array with
			// pixel coords of each tick:
			let tickArr    = xScale.range();
			let tickWidth  = tickArr[1] - tickArr[0];
			let txtSel     = xAxisGroup.selectAll("text");
			
	    	txtSel
		    	.attr("y", 0)
		    	.attr("x", 0)
		    	.attr("class", "axis x label");
		    	//*****.attr("transform", "rotate(45)")
		    	//*****.style("text-anchor", "start")
		}
		
		/* ---------------------------- Y AXIS ---------------------------- */		
		
		// Create a group, and call the xAxis function to create the axis:
		let yAxisGroup = svg.append("g")
			 .attr("class", "axis")
			 .attr("id", "yAxisGrp")
			 //.attr("transform", "translate("[Y_AXIS_LEFT_PADDING + (height - Y_AXIS_TOP_PADDING) + ")")	
			 .attr("transform", `translate(${Y_AXIS_LEFT_PADDING}, ${Y_AXIS_TOP_PADDING})`)	
		     .call(d3.axisLeft(yScale));

		if (typeof(extentDict.y.subclass) !== 'undefined' ) {
			yAxisGroup.classed(extentDict.y.subclass, true)
		}
		
		if (typeof(extentDict.y.axisGrpName) !== 'undefined') {
			yAxisGroup.attr('id', extentDict.y.axisGrpName);
		}
		
		
		/* -------------------------- Axis Labels (for Axes themselves, not ticks) ----------- */
		
		let xAxisLabel = svg.append("text")
						.attr("class", "x label")
						.attr("id", extentDict.x.axisLabelId)
						.attr("text-anchor", "middle")
						.attr("x", width / 2.0)
						.attr("y", height + 20)
						.text(extentDict.x.axisLabel)
						
		let yAxisLabel = svg.append("text")
						.attr("class", "axis y label")
						.attr("id", extentDict.y.axisLabelId)
						.text(extentDict.y.axisLabel)
						
		d3.selectAll('.axis text').classed('unselectable', true);			
		d3.selectAll('.x.label').classed('unselectable', true);
		d3.selectAll('.y.label').classed('unselectable', true);
		
		return {xScale    : xScale,
				yScale    : yScale,
				bandWidth : bandWidth,
			   }
	}
	
	/*---------------------------
	| normalizeDeathCauses 
	-----------------*/

	var normalizeDeathCauses = function() {
		
		// Turn death cause percentages to probabilities:
		let normalizedProbs = normalizeProbs(Object.values(DEATH_CAUSES));
		let causes = Object.keys(DEATH_CAUSES);
		for ( let i=0; i<normalizedProbs.length; i++ ) {
			DEATH_CAUSES[causes[i]] = normalizedProbs[i];
		}
	}
	
	/*---------------------------
	| createTooltip 
	-----------------*/
	
	var createTooltip = function() {
		
		// Define the div for the tooltip
		
		tooltipDivSel = d3.select("body")
							.append("div")	
							   .attr("class", "div tooltip");
		tooltipTxtSel = tooltipDivSel					   
						.append("text")
						  .attr("class", "div tooltip state")
						  .text("");
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

var probViz = ProbabilityViz(400, 500);


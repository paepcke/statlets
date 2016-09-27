import { EventGenerator } from "./biasedEventGenerator";
import { StatsBarchartResizeHandler } from "./../../utils/js/statsBarchartResizeHandler";
import { DragHandler } from "./../../utils/js/generalDragHandler";
import { SoftAlert } from "./../../utils/js/softAlerts";
import { CookieMonster } from "./../../utils/js/cookieMonster";
import { Logger } from "./../../utils/js/logging";
import { CoordinateSystem } from "./../../utils/js/coordinateSystem";
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
	
	var distribCoordSys  = null;
	
	var xDomain 	     = null;
	var yDomain 	     = null;
	var xDomainAllStates = null;
	var xDomainSaved     = null;
	
	var tooltipDivSel    = null;
	var tooltipTxtSel	 = null;
	
	var coordSysDistrib  = null;
	var distribCauses    = null;
	
	var slotBodies       = {};   // The coordinate systems and hit counts for each slot module.

	var browserType      = null;
	var alerter          = null;
	var logger           = null;
	var cookieMonster    = null;
	
	var machinesSvg      = null;
	var distribSvg       = null;
	
	var eventGenerator   = null;
	
	// Bar-sliding dispatch for interested
	// listeners:
	var dispatch         = null;
	
	var selectedSlotModules = [];
	var slotModPeripherals  = {};
	
	// Two text elements to switch
	// between in the slot window: ******** Maybe no longer needed
	var slotTxt1Sel      = null;  //*********
	var slotTxt2Sel      = null;  //*********
	
	var slotTxtMan       = null;
	
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
	
	const TOOLTIP_SHOW_DURATION       = 2000; // msecs
	
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
	var SLOT_WINDOW_LEFT_PADDING  = 8;

	// Speed at which text in slot window
	// fades and appears with only one slot change:
	var SLOT_TXT_TRANSITION_SPEED_1   = 500; // msecs
	// Delays between runs of 10:
	var SLOT_TXT_TRANSITION_SPEED_10  = 300; // msecs
	var SLOT_TXT_TRANSITION_SPEED_100 = 100; // msecs
	
	// Probability below which bars in the distribution
	// chart need a handle for dragging:
	var ADD_DISTRIB_BAR_HANDLE_THRESHOLED = 0.005; // probability
	
	
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
			"Jump or lie before moving object" : 0.0001444,
			"Bicycle accident" : 0.0000718,
			"Explosion of other materials" : 0.0000541,
			"Furuncle of buttock" : 0.0000072
	};
	
	// Keep a copy of the original, i.e. true probabilities
	// to use for resetting to initial state:
	let savedDeathCauses = Object.assign({}, DEATH_CAUSES);
	
	
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
		
		cookieMonster  = CookieMonster();
		
		// Manager of text elements for slot modules:
		slotTxtMan = TextManager();

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
			
		distribSvg = d3.select("#distribDiv").append("svg")
		   .attr("width", "100%")
		   .attr("height", "100%")
		   .attr("id", "distribSvg")
		   .attr("class", "distribSvg")

		eventGenerator = EventGenerator(DEATH_CAUSES);
		// Create one slot module that will serve as
		// the source of others; it will be semi-transparent:
		let urSlotSel = createSlotModuleWell('urSlotModule');
		// urSlotSel.attr("opacity", 0.5);
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
		 * 
		 * Returns a D3 selection of the outermost SVG
		 * that holds all the inner machinery of a slot module.
		 */

		// Outer body of this slot module (not an SVG rect!)
		let slotModBodySel = d3.select("#machinesDiv")
			.append("rect")
				.style("left", `${SLOT_MODULE_TOP_PADDING}px`)
				.style("top", `${SLOT_MODULE_LEFT_PADDING}px`)
				.attr("id", moduleId)
				.attr("class", "machinesBody")
				
		// Remember this slot module chassis:
		slotBodies[slotModBodySel] = {};
				
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
		slotTxt1Sel = slotModSvgSel
			.append("text")
				.text("")
				.attr("id", "slotTxt1Sel")
				.attr("class", "slotWindowTxt");
		
		// Give this slot window text element to the manager:
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
		slotTxt2Sel = slotModSvgSel
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
		
		slotBodies[slotModBodySel].deathCauseCounts = {};
		let deathCauseCounts = slotBodies[slotModBodySel].deathCauseCounts;
		
		for ( let cause of Object.keys(DEATH_CAUSES) ) {
			deathCauseCounts[cause] = 0;
		}
		
		setSlotWindowTxt("Click a GO button");
		
		// A function that updates a slot module's histogram:
		let updateHistogram = partial(updateSlotModHistogram, slotModBodySel);
		
		addButton(slotModSvgSel, "Go", function(evt) {
				   let deathCause = eventGenerator.next();
				   // Update this slot module's cause counts:
				   addDeathCauseCount(slotModBodySel, deathCause);
				   setSlotWindowTxt(deathCause, SLOT_TXT_TRANSITION_SPEED_1, updateHistogram);
			   });
		addButton(slotModSvgSel, "Go x10", function(evt) {
				    // Pick 10 random death causes:
					let txtInfo = [];
					for ( let i=0; i<10; i++ ) {
						txtInfo.push(eventGenerator.next());
					}
				    // Update this slot module's cause counts:
					for ( let deathCause of txtInfo ) {
						addDeathCauseCount(slotModBodySel, deathCause);
						setSlotWindowTxt(txtInfo, SLOT_TXT_TRANSITION_SPEED_10, updateHistogram);
				    } 
			   });
		addButton(slotModSvgSel, "Go x100", function(evt) {
				    // Pick 100 random death causes:			
					let txtInfo = [];
					for ( let i=0; i<100; i++ ) {
						txtInfo.push(eventGenerator.next());
					}
				    // Update this slot module's cause counts:
					for ( let deathCause of txtInfo ) {
						addDeathCauseCount(slotModBodySel, deathCause);
						setSlotWindowTxt(txtInfo, SLOT_TXT_TRANSITION_SPEED_100, updateHistogram);
				    } 
			   });
		
		// Add small death cause occurrences histogram
		// at bottom of chassis:
		addSlotModFrequencyChart(slotModSvgSel);
		addBettingSelection(slotModBodySel);
		
		addSlotModuleDragging(slotModBodySel);
		
		return slotModSvgSel;
	}
	
	/*---------------------------
	| addSlotModFrequencyChart
	-----------------*/
	
	var addSlotModFrequencyChart = function(slotModSvgSel) {
		
		let histXDomain = Object.keys(DEATH_CAUSES);
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
        // Get selection of slot body chassis:
        let slotModBodySel = d3.select(slotModSvgSel.node().parentNode);
        // And save this slot module's coordinate system there:
        slotBodies[slotModBodySel].coordSys = CoordinateSystem(coordInfo); 
	}	

	/*---------------------------
	| addBettingSelection 
	-----------------*/
	
	var addBettingSelection = function(slotModBodySel) {
		
		let bettingSel = slotModBodySel
			.append("select")
			.attr("class", "bettingSelector")
			.on("focus", function() {
				setBettingEntries(slotModBodySel, Object.keys(DEATH_CAUSES));
				let savedIndx = d3.select(this).attr("savedIndx"); 
				if ( typeof(savedIndx) !== 'undefined') {
					this.selectedIndex = savedIndx;
				}
			})
			.on("blur", function() {
				let deathCause = this.value;
				let abbrev = deathCause.slice(0,13) + '...';
				let oldSelIndx = this.selectedIndex;
				setBettingEntries(slotModBodySel, [abbrev])
					.attr("selectedIndex", 0)
					.attr("savedIndx", oldSelIndx);
			})
			

		setBettingEntries(slotModBodySel, ["Place your bet"]);
	}
	
	/*---------------------------
	| setBettingEntries 
	-----------------*/
	
	var setBettingEntries = function(slotModBodySel, txtArr) {
		
		slotModBodySel.select("select").selectAll("option").remove();
		let selectElSel = slotModBodySel.select("select");
		
		selectElSel.selectAll("option")
			.data(txtArr)
			.enter()
			.append("option")
				.each(function(txt) {
					this.text = txt;
				});
		return selectElSel;
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
				.on('start', function(d) {
					
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
				.on('drag', function(d) {
					let modSel = d3.select(this);
					if (modSel.empty()) {
						// Not over a slot module:
						return;
					} 
					
					let mouseY  = d3.event.y;
					let slotModX = modSel.x;
					let slotModY = modSel.y;
					
//					if (mouseY < slotModY 
//						// Mouse got ahead of the bar being resized.
//						// Select the bar we are dragging instead:
//						barSel = d3.select(d3.drag.currBar);
//						if (barSel.empty()) {
//							// Not over a bar:
//							return;
//						} 
//					}
					
					if (! modSel.classed("dragging")) {
						// Not over something being dragged:
						return;
					}
					
					let dragHandler    = slotModPeripherals[slotModId]["dragHandler"];
					let slotModBodySel  = slotModPeripherals[slotModId]["slotModBodySel"];
					dragHandler.dragmove(slotModBodySel, false); // false: NOT an SVG element; outer body is an HTML5 rect
					// Let interested parties know that a slot module was moved:
					dispatch.call("drag", this, modSel);
				})
				.on('end', function(d) {
					d3.select(this).classed("dragging", false);
					d3.drag.currSlotMod = undefined;
					upLog("dragSlotMod");
				})
	      	)
		
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

		// Get function barPulled() 
		// a chance to see which bar moved, and to 
		// adjust other bars to keep the sum of bar
		// heights equalling 1.

		dispatch = d3.dispatch('drag', barPulled);
		dispatch.on("drag.deathCauseBar", barPulled);

		// Generate bar chart for cause of death probabilities:
        updateDistribChart(DEATH_CAUSES, coordSysDistrib);
        attachBarBehaviors();
	}
	
	/*---------------------------
	| updateDistribChart
	-----------------*/
	
	var updateDistribChart = function(deathCauseObj, coordSysDistrib) {
		
		let xScale = coordSysDistrib.xScale;
		let yScale = coordSysDistrib.yScale;
		let causesToInclude = coordSysDistrib.xDomain;
		
				
		let barsSel = d3.select('#distribSvg').selectAll('.deathCauseBar')
			// Data are the causes of death:
   		  .data(causesToInclude)
	      		.attr('y1', function(deathCause) {
	      			return prob2Px(deathCauseObj[deathCause]);
	      		})
	      		.attr("class", "deathCauseBar")
	      		.style("stroke-linecap", function(deathCause) {
	      			// Bars long enough to grab with mouse get straight edge top,
	      			// others get round head:
	      			if ( deathCauseObj[deathCause] > ADD_DISTRIB_BAR_HANDLE_THRESHOLED ) {
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
	      			if ( deathCauseObj[deathCause] > ADD_DISTRIB_BAR_HANDLE_THRESHOLED ) {
	      				return "butt";
	      			} else {
	      				return "round";
	      			}
	      		})
	      		.attr("id", function(deathCause) { 
	      			return 'distribBar' + deathCause.replace(/ /g, '_').replace(/'/, '');
	      		})
	      		.attr("deathCause", function(deathCause) { return deathCause })
	      		.attr("deathProb", function(deathCause)  { return DEATH_CAUSES[deathCause] })
	      		.attr("x1", function(deathCause) { 
	      			return xScale(deathCause) + xScale.bandwidth()/2;
	      		})
	      		.attr("x2", function(deathCause) { 
	      			return xScale(deathCause) + xScale.bandwidth()/2;
	      		})
	      		.attr("y1", function(deathCause) { 
	      			return prob2Px(deathCauseObj[deathCause]);

	      		})
	      		.attr("y2", function(deathCause) { 
	      			return (height - X_AXIS_BOTTOM_PADDING);
	      		})
	      		.attr("stroke-width", xScale.bandwidth())
	}
	
	/*---------------------------
	| updateSlotModHistogram 
	-----------------*/
	
	var updateSlotModHistogram = function(slotModBodySel) {
			//deathCauseCounts, coordSys) {
		/*
		 * Given an object containing the number of times each 
		 * cause of death has appeared, and the coordinate system
		 * instance of a slot module, update the module's histogram.
		 */
		
		let coordSys = getCoordSys(slotModBodySel);
		let deathCauseCounts = slotBodies[slotModBodySel].deathCauseCounts;
		let counts = Object.values(deathCauseCounts)
		
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
		
		d3.selectAll(".deathCauseBar")
		
	      	.on("mouseover", function() {
	      		let evt         = d3.event;
	      		let deathCause	= d3.select(this).attr("deathCause");

	      		tooltipTxtSel.html(deathCause + ': ' + DEATH_CAUSES[deathCause].toPrecision(3) + 
	      						   '<p><i>Drag me up or down</i>'
	      						   
	      		);
	      		
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
					// Remember its original position so that
					// we can later re-normalize the other probs:
					d3.drag.origY    = this.y1.baseVal.value; // For rect-bars: change to "y"
					
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
					//*****dispatch.call("drag", this, barSel);
				})
				.on('end', function(d) {
					d3.select(this).classed("dragging", false);
					// Re-normalize the death cause probabilities,
					// and update all other bars. We pass the selection
					// of the bar that was raised/lowered, and the
					// amount it moved (change to "y" for rects):
					let barSel = d3.select(this);
					let deathCause = barSel.attr("deathCause");
					DEATH_CAUSES[deathCause] = px2Prob(d3.event.y);
					// If bar was dragged down, y increased. So the
					// following will be positive:
					normalizeDeathCauses(barSel, this.y1.baseVal.value - d3.drag.origY);
					updateDistribChart(DEATH_CAUSES, coordSysDistrib);
					d3.drag.currBar = undefined;
					upLog("dragDeathCause")
				})
	      	)
	}
	
	/*---------------------------
	| setSlotWindowTxt 
	-----------------*/
	
	var setSlotWindowTxt = function(txtInfo, transitionSpeed, callback) {

		if ( typeof(txtInfo) === "string") {
			txtInfo = [txtInfo];
		}
		
		if ( typeof(transitionSpeed) === 'undefined' ) {
			transitionSpeed = SLOT_TXT_TRANSITION_SPEED_1;
		}
		
		if ( txtInfo.length === 0 ) {
			return;
		}
		
		// If there are many text elements to display in 
		// sequence, the browser lags behind, even with
		// short transition speed settings. In that case
		// just display with small delay in between, rather 
		// than fade:
		let doFade = true;
		if ( txtInfo.length > 1 ) {
			doFade = false;
		}

		let oneRun = function() {
		
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
							oneRun();
						});
				slotTxtMan.makeNxtHot();
			} else {
				slotTxtMan.hotSel().style("opacity", 0);
				slotTxtMan.coldSel().style("opacity", 1);
				slotTxtMan.makeNxtHot();
				d3.timeout(function() {
					callback();
					oneRun();
				}, transitionSpeed);
			}
		}
		oneRun();
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
			  .attr("class", "button newSlotModule");

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
		case "reset":
			// Restore true cause-of-death probabilities:
			Object.assign(DEATH_CAUSES, savedDeathCauses);
			normalizeDeathCauses();
			updateDistribChart(DEATH_CAUSES, coordSysDistrib);
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
			break;
		}
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
		
		if ( typeof(barSel) === 'undefined') {
			// Turn death cause percentages to probabilities:
			let normalizedProbs = normalizeProbs(Object.values(DEATH_CAUSES));
			let causes = Object.keys(DEATH_CAUSES);
			for ( let i=0; i<normalizedProbs.length; i++ ) {
				DEATH_CAUSES[causes[i]] = normalizedProbs[i];
			}
		} else {
			
			// Update the just-dragged bar with its new probability:
			let thisBarCause 		   = barSel.attr("deathCause");
			DEATH_CAUSES[thisBarCause] = px2Prob(barSel.attr("y1"));
			let newProb                = DEATH_CAUSES[thisBarCause];
			barSel.attr("deathProb", newProb);
				
			let currentProbs = Object.values(DEATH_CAUSES);
			// Blank out the user-adjusted probability:
			let currCauseIndx = Object.keys(DEATH_CAUSES).indexOf(thisBarCause);
			currentProbs[currCauseIndx] = 0;
			currentProbs = normalizeProbs(currentProbs, 1-newProb);
			// Put the true current prob back in:
			currentProbs[currCauseIndx] = parseFloat(barSel.attr("deathProb"));
			for ( let i=0; i<currentProbs.length; i++ ) {
				DEATH_CAUSES[Object.keys(DEATH_CAUSES)[i]] = currentProbs[i];
			}
				
			//************
			let sum = Object.values(DEATH_CAUSES).reduce(function(a,b) { return a+b }, 0);
			//1+1; // just a statement to attach a breakpoint to
			//console.log(`Sum = ${sum}`);
			//************

		}
		
		// Get a new event generator that is biased
		// according to the new distribution:
		eventGenerator = EventGenerator(DEATH_CAUSES);

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
				tspan.text(line.join(" ").trim());
				if (tspan.node().getComputedTextLength() > width) {
					// Yep, this word is one too many for this line;
					// omit the word from the line being built,...
					line.pop();
					// ... and create txt from the array
					// that do fit:
					tspan.text(line.join(" ").trim());
					// The word we couldn't fit is the first on the nxt line:
					line = [word];
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
		
		if ( typeof(barSel) === 'undefined') {
			// Turn death cause percentages to probabilities:
			let normalizedProbs = normalizeProbs(Object.values(DEATH_CAUSES));
			let causes = Object.keys(DEATH_CAUSES);
			for ( let i=0; i<normalizedProbs.length; i++ ) {
				DEATH_CAUSES[causes[i]] = normalizedProbs[i];
			}
		} else {
			
			// Update the just-dragged bar with its new probability:
			let thisBarCause 		   = barSel.attr("deathCause");
			DEATH_CAUSES[thisBarCause] = px2Prob(barSel.attr("y1"));
			let newProb                = DEATH_CAUSES[thisBarCause];
			barSel.attr("deathProb", newProb);
				
			let currentProbs = Object.values(DEATH_CAUSES);
			// Blank out the user-adjusted probability:
			let currCauseIndx = Object.keys(DEATH_CAUSES).indexOf(thisBarCause);
			currentProbs[currCauseIndx] = 0;
			currentProbs = normalizeProbs(currentProbs, 1-newProb);
			// Put the true current prob back in:
			currentProbs[currCauseIndx] = parseFloat(barSel.attr("deathProb"));
			for ( let i=0; i<currentProbs.length; i++ ) {
				DEATH_CAUSES[Object.keys(DEATH_CAUSES)[i]] = currentProbs[i];
			}
				
			//************
			let sum = Object.values(DEATH_CAUSES).reduce(function(a,b) { return a+b }, 0);
			1+1; // just a statement to attach a breakpoint to
			console.log(`Sum = ${sum}`);
			//************

		}
		
		// Get a new event generator that is biased
		// according to the new distribution:
		eventGenerator = EventGenerator(DEATH_CAUSES);

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
				elementMouseIsOverSel.classed("noPointerEvents", true);
				elementMouseIsOverSel = d3.select(document.elementFromPoint(x, y));
			}
		} finally {
			/* Now clean it up */
			d3.select(".noPointerEvents")
			.classed("noPointerEvents", false);
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
		return Object.values(DEATH_CAUSES).reduce(function(a,b) { return a+b }, 0);
	}
	
	/*---------------------------
	| numZeroProbs 
	-----------------*/

	var numZeroProbs = function() {
		/*
		 * Counts and returns the number of death causes that
		 * are zero. 
		 */
		let numZeroesSoFar = 0;
		for ( let prob of Object.values(DEATH_CAUSES) ) {
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
		
		let deathCauseCount = slotBodies[slotModBodySel].deathCauseCounts
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
		let deathCauseCounts = slotBodies[slotModBodySel].deathCauseCounts;
		return deathCauseCounts[deathCause];
	}
	
	/*---------------------------
	| clearDeathCauseCount 
	-----------------*/
	
	var clearDeathCauseCount = function(slotModBodySel) {
		/*
		 * Zeroes all the slot module's death cause counts:
		 */
		
		let deathCauseCounts = slotBodies[slotModBodySel].deathCauseCounts;
		for ( let deathCause of Object.keys(deathCauseCounts) ) {
			deathCauseCounts[deathCause] = 0;
		};
	}
	
	/*---------------------------
	| getCoordSys 
	-----------------*/
	
	var getCoordSys = function(slotModBodySel) {
		return slotBodies[slotModBodySel].coordSys
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

		return { hotSel        : hotSel,
			coldSel       : coldSel,
			makeNxtHot    : makeNxtHot,
			addTxtElement : addTxtElement
		}
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


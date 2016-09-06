/*
 * Todo:
 *    o New Sample shouldn't require login
 *    o Change the logInteraction() in uxrecorder to dict.get(key,default)
 *    o Test that login OK/NOK still works in uxrecorder.
 *    o Instead of logServerDown* user, make a session ID.
 *    o Instrumentation
 * Text:
 *         
 */

/* *************
import { StatsBarchartResizeHandler } from "./statsBarchartResizeHandler";
import * as alerts from "./softAlerts";
import * as cookieMonster from "./cookieMonster";
import * as ss from "./simple-statistics.min";
import * as d3 from "./d3.min";
import * as logging from "./log4javascript.min";
********/
var ConfidenceViz = function(width, height) {

	// Instance variables:

	var that             = null;  // Reference to this instance
	
	var width   	     = width;
	var height  	     = height;
	var dragClickHandler = null;
	var currBtn		 	 = null; // Currently active exercise-step button.
	
	var scalesData	     = null;  // {xScale : <xScaleFunc>, yScale : <yScaleFunc>}
	var scalesAllStates  = null;  // {xScale : <xScaleFunc>, yScale : <yScaleFunc>}
	var xDomain 	     = null;
	var yDomain 	     = null;
	var xDomainAllStates = null;
	var xDomainSaved     = null;

	var tooltipDivSel    = null;
	var tooltipTxtSel	 = null;

	var svgData			 = null;
	var svgAllStates     = null;	
	
	var browserType      = null;
	
	var alerter          = null;
	var logger           = null;
	var cookieMonster    = null;
		
	// Constants:

	const X_AXIS_LEFT_PADDING         = 0;  // X axis distance left SVG edge
	const X_AXIS_BOTTOM_PADDING       = 70; // X axis distance bottom SVG edge  50
	const X_AXIS_RIGHT_PADDING        = 50; // X axis distance right SVG edge
	const Y_AXIS_BOTTOM_PADDING       = 80; // Y axis distance from SVG bottom
	const Y_AXIS_TOP_PADDING          = 10; // Y axis distance from SVG top
	const Y_AXIS_LEFT_PADDING   	  = 50; // Y axis distance from left SVG edge
	   
	const ALL_STATES_LEFT_BAR_PADDING = 5; // For allStates: leave white between Y-axis
										  // and first bar for conf int bracket.
	const CI_LEFT_PADDING             = 3; // horizontal distance of conf interval bracket
								     	  // from all-states y axis:
	const CI_SMALL_EDGE_LEN           = 3;  // Small leg of the CI bracket
	   
	const X_TOOLTIP_PADDING           = 100; // Fixed x position for tooltip
	   
	const DOT_RADIUS                  = 10;  // pixels.
	
	const NUM_SAMPLES                 = 5;

	// Will be set later, then stays constant.
	var ALL_STATE_MEAN                = null;
	
	var STATE_TBL = {Alabama : 'AL',
					 California : 'CA',
					 Georgia    : 'GA',
					 Nevada     : 'NV',
					 Mississippi: 'MS'
	}

	var origTeenBirthObj = {"Mississippi": 10.132693102023957, "Oklahoma": 9.111531899735652, "Delaware": 5.71454611738972, 
						"Minnesota": 3.908216983291371, "Illinois": 6.107621282070688, "Arkansas": 9.932227155877541, 
						"New Mexico": 9.880239520958083, "Indiana": 7.472645099904852, "Maryland": 4.640088743388212, 
						"Louisiana": 8.322867730282029, "Idaho": 5.69592586116454, "Wyoming": 7.081600831600832, 
						"Tennessee": 8.372343815102571, "Arizona": 7.676637471658591, "Iowa": 5.213294025751505, 
						"Michigan": 6.151693989071038, "Kansas": 6.878617137903781, "Utah": 4.261641318371975, 
						"Virginia": 4.762826718296225, "Oregon": 5.290192290806919, "Connecticut": 3.9520463001240183, 
						"Montana": 6.491312741312742, "California": 5.419395122882443, "Massachusetts": 3.3668020248094788, 
						"West Virginia": 9.836953844638195, "South Carolina": 7.541603762125392, "New Hampshire": 3.934319622825557, 
						"Wisconsin": 5.083307276544423, "Vermont": 5.00815660685155, "Georgia": 7.454981442732119, 
						"North Dakota": 4.96522581213135, "Pennsylvania": 5.6140523518992325, "Florida": 5.890240964403089, 
						"Alaska": 5.66186797752809, "Kentucky": 8.762684707139043, "Hawaii": 4.814016172506738, "Nebraska": 5.266104351720535, 
						"Missouri": 7.010350318471337, "Ohio": 6.8783296407035355, "Alabama": 8.537242098885935, "New York": 4.211531454561445, 
						"South Dakota": 5.983880159570138, "Colorado": 5.172413793103448, "New Jersey": 3.6096994337156962, 
						"Washington": 4.658802280295761, "North Carolina": 6.932837363091548, "D.C.": 5.941739404774424, 
						"Texas": 8.888449743099713, "Nevada": 6.898859485234656, "Maine": 5.158292644510946, "Rhode Island": 5.451353598817334
						};
	
	// A copy that we modify as users
	// move bars around:
	var teenBirthObj = JSON.parse(JSON.stringify(origTeenBirthObj));
	
	// T-table for two-tailed, 95% critical value.
	// The leading zero is just so that we can index
	// into the tbl directly with the df:
	var tTbl2Tailed95 = [6.314, 2.920, 2.353, 2.132, 2.015, 1.943, 1.895, 1.860, 1.833, 1.812, 
	                     1.796, 1.782, 1.771, 1.761, 1.753, 1.746, 1.740, 1.734, 1.729, 1.725, 
	                     1.721, 1.717, 1.714, 1.711, 1.708, 1.706, 1.703, 1.701, 1.699, 1.697, 
	                     1.696, 1.694, 1.692, 1.691, 1.690, 1.688, 1.687, 1.686, 1.685, 1.684, 
	                     1.683, 1.682, 1.681, 1.680, 1.679, 1.679, 1.678, 1.677, 1.677, 1.676, 
	                     1.675, 1.675, 1.674, 1.674
						 ]
	
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
		
		// Find the div in which the chart is to reside,
		// and its dimensions:

		//*****************
		// Test of early alerter note:
		//alerter.note('<a href="">Foobar</a>', true);
		//*****************		
		
		let chartDiv = document.getElementById('dataDiv');
			
		width  = chartDiv.clientWidth;
		height = chartDiv.clientHeight;
		
		//*************
		height = 400;
		//*************			
		

		// The "+40" is a kludge! It accounts
		// for the additional space that the x-axis
		// labels will take once they are rotated
		// 45 degrees: 
		d3.select('#dataDiv')
			.style("height", height + 40)
					
		svgData = d3.select("#dataDiv").append("svg")
		.attr("width", "100%")
		.attr("height", "100%")
		.attr("id", "dataSvg")
		.attr("class", "svgData")
		
		if (browserType === 'Firefox1+') {
			svgData.attr("viewBox", `0 -60 ${width} 500`);
		} else {
			svgData.attr("viewBox", `0 -60 ${width} 500`);
		}

		dragClickHandler = StatsBarchartResizeHandler(svgData);
		
        yDomain      = [0, Math.max.apply(null, Object.values(teenBirthObj))];
        
        xDomain      = sampleFromStates(NUM_SAMPLES); 
        // Remember original samples for resetting (via reset button):
        xDomainSaved = xDomain.map(function(el) { return el });
        
        // Argument for makeCoordSys:
        let extentDict  = {svg           : svgData, 
        				   x: {scaleType : 'ordinal',
        					   domain    : xDomain,
        					   axisLabel : 'Sample of US States',
        					 axisLabelId : 'dataXLabel',
        					 axisGrpName : 'dataXAxisGrp'
            				  },
            			   y: {scaleType : 'linear',
            				      domain : yDomain,
            				   axisLabel : 'Teen Pregnancy Rate',
            			     axisLabelId : 'dataYLabel',
            			     axisGrpName : 'dataYAxisGrp'            			    	 
            			      }
                          };

		scalesData = makeCoordSys(extentDict);
				
		// Generate bar chart for the chosen states:
        updateDataChart(xDomain, teenBirthObj, scalesData);
		
        
		// Build the all-states chart:
		
        let yDomainAllStates = [0, Math.max.apply(null, Object.values(teenBirthObj))];
        
        xDomainAllStates = Object.keys(teenBirthObj);
        
        
		// The "+40" is a kludge! It makes the 
		// svg height of the all-states chart
		// match the kludge needed for the data svg
		// height:
		d3.select('#allStatesDiv')
			.style("height", height + 40)
			.attr("class", "allStatesDiv");
		
		svgAllStates = d3.select("#allStatesDiv").append("svg")
		.attr("width", "100%")
		.attr("height", "100%")
		.attr("id", "allStatesSvg")
		.attr("class", "svgAllStates")
						
		// Adjust viewbox depending on Chrome vs. FF. Yikes!
		if ( browserType === 'Firefox1+') {
			// Viewbox values are strings like: "0 -60 315 500" 
			// Convert to this: ["0", "-60", "315", "500"]
			let dataViewBoxArr = d3.select("#dataSvg").attr("viewBox").split(" ");
			let dataViewBoxY     = dataViewBoxArr[1];
			let dataViewBoxWidth = dataViewBoxArr[2];
			svgAllStates.attr("viewBox", `0 -50 ${width} 480`) // 
		} else {
			svgAllStates.attr("viewBox", `0 -10 ${width} ${height}`) // Perfect for Chrome
		}
		
        extentDict  = {svg             : svgAllStates,
        			   x: {scaleType   : 'ordinal',
        				   domain      : xDomainAllStates,
        				   axisLabel   : 'All US States',
        				   axisLabelId : 'allStatesXLabel',
        				   subclass    : 'noLabels',          // styled separately.
        				  rightPadding : 5,
        				  axisGrpName  : 'allStatesXAxisGrp'        				  
            			  },
            		   y: {scaleType   : 'linear',
            		       domain      : yDomainAllStates,
        				   axisLabel   : 'Teen Pregnancy Rate',
        				   axisLabelId : 'allStatesYLabel',
        				   axisGrpName : 'allStatesYAxisGrp'        				          				   
            		      }
                       };

		scalesAllStates = makeCoordSys(extentDict);

		// Generate bar chart for the chosen states:
        updateAllStatesChart(xDomainAllStates, teenBirthObj, scalesAllStates);
		
        let sampleTeenBirthRates = xDomain.map(function(state) { return teenBirthObj[state] });
        
        // Add horizontal mean-lines to both charts:
        addMeanLine( { svg       : svgData, 
        			   yData     : sampleTeenBirthRates,
        			   yScale    : scalesData.yScale,
        			   length    : width - Y_AXIS_LEFT_PADDING,
        			   lineClass : 'meanLineSample'
        	});
        
        addMeanLine( { svg   : svgAllStates,
        			   yData : Object.values(teenBirthObj),
        			   yScale: scalesData.yScale,
        			   length: width - Y_AXIS_LEFT_PADDING,
        			   lineClass : 'meanLineAllStates'
        	});
        
        // Init the all-states teen birth rate mean var:
        ALL_STATE_MEAN = ss.sum(Object.values(teenBirthObj)) / Object.values(teenBirthObj).length;
        
        // Add the allStates SD display:
        let sd = ss.standardDeviation(Object.values(teenBirthObj));
        sd = sd.toFixed(2);
        svgAllStates
			.append("g")
			   .attr("class", "sdGrp")
			.append("text")
			   .attr("class", "sdTxt allStates unselectable")
			   .attr("id", "sdAllStatesTxt")
			   .text(`SD: ${sd}`)
        
        
        let ci = computeConfInterval( { dataArr  	  : sampleTeenBirthRates,
        								populationSize: xDomainAllStates.length, // all states
        								makeSmallPopCorrection : true
        						     });		

        createCIViz(ci);        						     
        addSamplingButtons()
        addControlButtons();
		addLegends();
		createTooltip();
		createSvgHeaders();
		
        
		return {width  : width,
				height : height,
			}
	}
	
		
	/*---------------------------
	| updateDataChart
	-----------------*/
	
	var updateDataChart = function(statesToInclude, teenBirthObj, scalesData) {
		
		let xScale = scalesData.xScale;
		let yScale = scalesData.yScale;
		
		// Get function barPulled() 
		// a chance to see which bar moved, and to mirror
		// on the confidence interval chart:
		let dispatch = d3.dispatch('drag', barPulled);
		dispatch.on("drag.teenBirthBar", barPulled);
				
		d3.select('#dataSvg').selectAll('.teenBirthBar')
			// Data are the states:
			.data(statesToInclude)
			 // Narrow existing bars:
	      	.attr('x', function(state) { return xScale(state) })
	      	.attr('width', xScale.bandwidth())
	      .enter().append("rect")
	      	.attr('class', 'teenBirthBar')
	      	.attr('id', function(state) { 
	      		return 'dataBar' + state })
	      	.attr('state', function(state) { return state } )
	      	.attr('x', function(state) { return xScale(state) })
	      	.attr('width', xScale.bandwidth())
	      	.attr('y', function(state) { return yScale(teenBirthObj[state]) + Y_AXIS_TOP_PADDING })
	      	.attr('height', function(state) { return (height - Y_AXIS_BOTTOM_PADDING) - yScale(teenBirthObj[state]) })
	      	.on("mouseover", function() {
	      		let evt     = d3.event;
	      		let state	= d3.select(this).attr("state");

	      		tooltipTxtSel.html(state + '<p><i>Drag me up or down</i>');
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
					if (barSel.attr('class') !== 'teenBirthBar') {
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
					let barX = barSel.attr('x');
					let barY = barSel.attr('y');
					
					if (mouseY < barSel.y || mouseY > height - X_AXIS_BOTTOM_PADDING) {
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
					
					dragClickHandler.dragmove(barSel);
					// Let interested parties know that a bar was resized.
					// Used to sync (synchronize) CI chart with data chart:
					//******dispatch.drag(this, barSel);
					dispatch.call("drag", this, barSel);
				})
				.on ('end', function(d) {
					d3.select(this).classed("dragging", false);
					d3.drag.currBar = undefined;
					log("dragState")
				})
	      	)
	}
	
	/*---------------------------
	| updateAllStatesChart
	-----------------*/

	var updateAllStatesChart = function(statesToInclude, teenBirthObj, scalesData) {
		
		let xScale = scalesData.xScale;
		let yScale = scalesData.yScale;
		
		d3.select('#allStatesSvg').selectAll('.allStatesBar')
			// Data are the teen birth rates:
			 .data(statesToInclude)
	      .enter().append("rect")
	      	.attr("class", 'allStatesBar')
	      	.attr("id", function(state) { return 'allStatesBar' + state })
	      	.attr("state", function(state) { return state })
	      	.attr("x", function(state) { return xScale(state) + ALL_STATES_LEFT_BAR_PADDING })
	      	.attr("width", xScale.bandwidth())
	      	.attr("y", function(state) { return yScale(teenBirthObj[state]) + Y_AXIS_TOP_PADDING })
	      	.attr("height", function(state) { return (height - Y_AXIS_BOTTOM_PADDING) - yScale(teenBirthObj[state]) })
	      	.on("mouseover", function() {
	      		let evt     = d3.event;
	      		let state	= d3.select(this).attr("state");
	      		
	      		tooltipTxtSel.text(state);
	      		let txtWidth  = tooltipTxtSel.node().getBoundingClientRect().width;
	      		let txtHeight = tooltipTxtSel.node().getBoundingClientRect().height;	      		
	      		
	      		let tooltipHeight = tooltipDivSel.node().getBoundingClientRect().height;
	      		tooltipDivSel.style("left", `${evt.pageX}px`)
	      					 .style("top", `${evt.pageY - tooltipHeight}px`)
	      					 .style("width", txtWidth)
	      					 .style("height", txtHeight);

	      		
	      		tooltipDivSel.classed("visible", true);
	      		tooltipTxtSel.classed("visible", true);
	      		
	      	})
	      	.on("mouseleave", function(evt) {
	      		tooltipTxtSel.classed("visible", false);
	      		tooltipDivSel.classed("visible", false);
	      	})
	}
	
	/*---------------------------
	| addMeanLine
	-----------------*/
	
	var addMeanLine = function( meanLineDict ) {
		/*
		 * Add a horizontal meanline from a Y axis
		 * to either the edge of the svg or the 
		 * a given length.
		 * 
		 *  { svg   	: svgData, 
		 *    yData 	: Object.values(teenBirthObj),
		 *    yScale	: yScale,
		 *    length	: <lineLength>
		 *    lineClass : <cssLineClass>
		 *    }
		 */
		
		let length = meanLineDict.length;
		let mean   = ss.mean(meanLineDict.yData);
		let meanY  = meanLineDict.yScale(mean);
		let svgContainer = meanLineDict.svg;
		
		let lineData = [ { x : Y_AXIS_LEFT_PADDING, y : meanY + Y_AXIS_TOP_PADDING}, 
		                 { x : length + Y_AXIS_LEFT_PADDING, y : meanY + Y_AXIS_TOP_PADDING }
		               ]

		let meanLineSel = d3.select('.' + meanLineDict.lineClass);
		if ( meanLineSel.empty() ) {
			// Create new mean line:
			svgContainer.append("path")
				.attr("d", getPathPointAccessor()(lineData))
				.attr("class", meanLineDict.lineClass);
		} else {
			// Move mean line:
			meanLineSel.attr("d", getPathPointAccessor()(lineData));
		}
	}
	
	/*---------------------------
	| getPathPointAccessor 
	-----------------*/
	
	var getPathPointAccessor = function() {
		
		/*
		 * Returns an accessor function that picks 
		 * the x and y pairs from a path point obj.
		 * Used to pass into "path" appends. 
		 */
		
		// Accessor function for each data point:
		return d3.line()
				.x(function(xyObj) { return xyObj.x; })
				.y(function(xyObj) { return xyObj.y; });
	}
	
	
	/*---------------------------
	| computeConfInterval 
	-----------------*/
	
	var computeConfInterval = function( ciInfo ) {
		/*
		 * ciInfo { dataArr  	   		   : <theDataVals>
		 * 			populationSize 		   : <number of units in population>
		 * 			makeSmallPopCorrection : <doOrDontMakeFinitePopCorr> 
		 * 
		 * Returns object: { lowBound  : lowConfidenceIntervalBound,
		 * 					 highBound : highConfidenceIntervalBound,
		 *                 }
		 *                 
		 */
		
		let data 	= ciInfo.dataArr;
		let N 		= ciInfo.populationSize;
		let n       = data.length;
		let df      = n-1;
		let t       = tTbl2Tailed95[df]		

		let mean    	  = ss.mean(data);
		let sd      	  = ss.sampleStandardDeviation(data);
		let se      	  = sd / Math.sqrt(n);
		
		let finitePopCorr = 1.0;
		if ( typeof(ciInfo.makeSmallPopCorrection) === 'undefined' || ciInfo.makeSmallPopCorrection ) { 
			finitePopCorr = Math.sqrt( (N - n) / (N - 1) );
		}
		
		let marginOfError = t * se * finitePopCorr;
		
		return { lowBound  : mean - marginOfError, 
				 highBound : mean + marginOfError
		}
	}
	
	/*---------------------------
	| createCIViz 
	-----------------*/
	
	var createCIViz = function(ciObj) {
		/*
		 * Creates bracket that shows the CI.
		 */

		let yScale = scalesAllStates.yScale;
		
		let lineData = [ { x : Y_AXIS_LEFT_PADDING + CI_LEFT_PADDING,
						   y : yScale(ciObj.highBound) + Y_AXIS_TOP_PADDING },
		
						 { x : Y_AXIS_LEFT_PADDING + CI_LEFT_PADDING + CI_SMALL_EDGE_LEN,
						   y : yScale(ciObj.highBound) + Y_AXIS_TOP_PADDING },
	
						 { x : Y_AXIS_LEFT_PADDING + CI_LEFT_PADDING + CI_SMALL_EDGE_LEN,
						   y : yScale(ciObj.lowBound) + Y_AXIS_TOP_PADDING },
						 
						 { x : Y_AXIS_LEFT_PADDING + CI_LEFT_PADDING,
						   y : yScale(ciObj.lowBound) + Y_AXIS_TOP_PADDING }
		               ]

		let ciVizSel = d3.select('#ciViz');
		
		if ( ! ciVizSel.empty() ) {
			ciVizSel.remove();
			ciVizSel = d3.select('#ciViz');
		}
		
		if ( ciVizSel.empty() ) {
			d3.select('#allStatesSvg')
				.append("path")
				.attr("d", getPathPointAccessor()(lineData))
				.attr("id", "ciViz")
				.attr("class", "confIntLine");
		} else {
			ciVizSel.attr("d", lineFunction(lineData))
		}
		
		updateSdViz();
	}
	
	/*---------------------------
	| addLegends 
	-----------------*/
	
	var addLegends = function() {
		
		let sampleLegendLineClass    = "meanLineSample";
		let allStatesLegendLineClass = "meanLineAllStates";
		
		// The legend stretch of line for mean color.
		// Coords are relative to a group in which the
		// legend text and line segment will reside.
		// The whole line is moved into place in the
		// CSS via a transform:
		let lineData = [ { x : 0, y : 0}, 
		                 { x : 20, y : 0 }
		]

		// Data chart legend:
		
		let dataLegendGrp = d3.select('#dataSvg')
			.append('g')
				.attr("id", "dataLegendGrp")
				.attr("class", "legendGrp")
		
		dataLegendGrp
			.append("path")
				.data([lineData])
				.attr("d", getPathPointAccessor())
				.attr("class", "sampleLegendMeanLine")
		
		dataLegendGrp
			.append("text")
				.text("Sample mean: ")
				.attr("x", -40)
				.attr("class", "legendSampleTxt data");
		
		// Population chart legend:
		
		
		// First the mean-line legend entry:
		let allStatesLegendGrp = d3.select('#allStatesSvg')
			.append('g')
				.attr("id", "populationLegendGrp")
				.attr("class", "legendGrp")
		
		allStatesLegendGrp
			.append("path")
				.data([lineData])
				.attr("d", getPathPointAccessor())
				.attr("class", "populationLegendMeanLine")
		
		allStatesLegendGrp
			.append("text")
				.text("Population mean: ")
				.attr("class", "legendPopulationTxt data ci");
		
		// Now the CI bracket legend entry:
		
		allStatesLegendGrp
			.append("text")
				.text("Confidence interval: ")
				.attr("id", "ciTxt")
				.attr("class", "legendPopulationTxt data");	
		
		allStatesLegendGrp
			.append("path")
				.data([lineData])
				.attr("d", getPathPointAccessor())
				.attr("class", "populationLegendConfIntLine");

	}
				

	/*---------------------------
	| updateSdViz 
	-----------------*/
	
	var updateSdViz = function( ) {
		
		// Compute SD of just the sample states:
		let sampleTeenBirthRates = xDomain.map(function(state) { 
			return teenBirthObj[state] });
		
		let sd = ss.sampleStandardDeviation( sampleTeenBirthRates );
		sd = sd.toFixed(2);
		
		let sdTxtSel = d3.select("#sdTxt");
		if ( sdTxtSel.empty() ) {
			// First-time call: 
			d3.select("#dataSvg")
			.append("g")
			   .attr("id", "sdGrp")
			   .attr("class", "sdGrp")
			.append("text")
			   .attr("class", "sdTxt data unselectable")
			   .attr("id", "sdTxt")
			   .text(`SD: ${sd}`)
		} else {
			sdTxtSel.text(`SD: ${sd}`)
		}
	}
	
	
	/*---------------------------
	| newSample 
	-----------------*/
	
	var newSample = function() {
		/*
		 * Selects one additional state as a sample.
		 * Updates xScale, xDomain, data mean line,
		 * and CI. Returns the new state.
		 */

		let currSampleSize = xDomain.length;

		// Get one new state's teen birth rates:
		let remainingStates = Object.keys(teenBirthObj)
								   .filter(function(i) {
									   return xDomain.indexOf(i) < 0;
									   });
		
		if (remainingStates.length === 0) {
			alert("No additional states: sample is entire population.");
			log("sampledAll");
			return(null);
		}
		
		let newState = sampleFromStates(1, remainingStates)[0];

		xDomain.push(newState);

		// New x axis without tick marks:
		let xAxisGroup = replaceXAxis( xDomain, false );
		
		// Make all but the new state invisible:
		xAxisGroup.selectAll('text')
		    .attr("class", function(state) {
				if  (state === newState) {
					return 'axis label';
				} else {
					return 'axis label invisible';
				}
		    })
			.attr("y", function(state) {
				if  (state === newState) {
					return d3.select(this).attr("y") + 10;
				}
		    })
		
        return newState;
	}
	
	/*---------------------------
	| replaceXAxis 
	-----------------*/
	
	var replaceXAxis = function( xDomain, keepTicks ) {
		
		/*
		 * Destroys the x-Axis and creates a new one.
		 * The optional keepTicks determines whether axis
		 * ticks are drawn, or not. Re-computes and re-draws
		 * data mean and the CI. Returns the new x-axis group. 
		 */
		
		if (typeof(keepTicks) === 'undefined') {
			keepTicks
		}
		
		scalesData.xScale = d3.scaleBand()
		.domain(xDomain)
		.rangeRound([Y_AXIS_LEFT_PADDING, width - X_AXIS_RIGHT_PADDING])
		.paddingInner(0.1);
		
		let xScale = scalesData.xScale;

		// Any previous >5-states x axis?
		d3.select('#dataXAxisGrp')
			.remove();

		// Create a group, and call the xAxis function to create the axis.
		let xAxisGroup = svgData.append("g")
			 .attr("class", "axis")
			 .attr("id", "dataXAxisGrp")
			 .attr("transform", `translate(${X_AXIS_LEFT_PADDING}, ${height - X_AXIS_BOTTOM_PADDING})`)
			 .call(d3.axisBottom(xScale));
		      
	    // Suppress X-axis ticks if requested:
		if ( ! keepTicks ) {
			 xAxisGroup.classed('noTicks', true) 
		}
		
		// Class the labels:
		let txtSel     = xAxisGroup.selectAll("text");

		txtSel
		.attr("y", 0)
		.attr("x", 0)
		.attr("class", "axis x label");

		// Width between two ticks is (for instance) pixel-pos
		// at first domain value minus pixel pos at zeroeth domain
		// value:
		scalesData.bandwidth = xScale.bandwidth();
		
		updateDataChart(xDomain, teenBirthObj, scalesData);
        addMeanLine( { svg       : svgData, 
        			   yData     : xDomain.map(function(state) { return teenBirthObj[state] }),
        			   yScale    : scalesData.yScale,
        			   length    : width - Y_AXIS_LEFT_PADDING,
        			   lineClass : 'meanLineSample'
        });
        
        let ci = computeConfInterval( { dataArr : xDomain.map(function(state) { return teenBirthObj[state] }),
        								populationSize : xDomainAllStates.length,
        								makeSmallPopCorrection : true
        	})
        createCIViz(ci);
		return xAxisGroup;
	}
	
	/*---------------------------
	| ensureRectHeights 
	-----------------*/
	
	var ensureRectHeights = function() {
		/*
		 * Go through every rectangle in the data
		 * chart and ensure its height corresponds
		 * to the current values in teenBirthObj.
		 */
		
		let yScale = scalesData.yScale;
		d3.selectAll(".teenBirthBar")
			.remove();
		updateDataChart(xDomain, teenBirthObj, scalesData);
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
		let xAxisGroup = svg.append("g")
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
	| barPulled
	-----------------*/
	var barPulled = function(dataBarSel) {
		/*
		 * Called when a data bar is dragged up or down. Finds the
		 * confidence interval chart, and echoes
		 * the move.
		 */
		
		let state = dataBarSel.attr("state");
		let newBirthRate = scalesData.yScale.invert(dataBarSel.attr('y') - Y_AXIS_TOP_PADDING); 
		teenBirthObj[state] = newBirthRate;
		
		updateDataChart(xDomain, teenBirthObj, scalesData);
        addMeanLine( { svg       : svgData, 
        			   yData     : xDomain.map(function(state) { return teenBirthObj[state] }),
        			   yScale    : scalesData.yScale,
        			   length    : width - Y_AXIS_LEFT_PADDING,
        			   lineClass : 'meanLineSample'
        });
        
        let ci = computeConfInterval( { dataArr : xDomain.map(function(state) { return teenBirthObj[state] }),
        								populationSize : xDomainAllStates.length,
        								makeSmallPopCorrection : true
        	})
        createCIViz(ci);
	}
	
	
	/*---------------------------
	| sampleFromStates
	-----------------*/
	
	var sampleFromStates = function(sampleSize, stateArr) {
		/*
		 * Given a sample size, return an array of randomly
		 * sampled US states. If stateArr is provided, then
		 * only the states in that array will be picked from.
		 * Else all 51 states (plus D.C.) are the population
		 */
		
		let arr = stateArr;
		if (typeof(stateArr) === 'undefined') {
			arr = Object.keys(teenBirthObj);
		}
		let shuffled = arr.slice(0), 
			i = arr.length, 
			temp, 
			index;
		while (i--) {
			index = Math.floor((i + 1) * Math.random());
			temp = shuffled[index];
			shuffled[index] = shuffled[i];
			shuffled[i] = temp;
		}
		return shuffled.slice(0, sampleSize);
	}		

	/*---------------------------
	| addSamplingButtons 
	-----------------*/
	
	var addSamplingButtons = function() {
		d3.select("#buttonCol")
			.append('input')
			  .attr("type", "button")
			  .attr("id", "addState")
			  .attr("value", "Add a state")
			  .attr("class", "button sampleBtn first")
			  .on("click", function() {
				  let newState = newSample();
				  blankDataStateLabels(newState);
				  log("addState");
				  })
			// .append('br');
			
		d3.select("#buttonCol")
			.append('input')
			  .attr("type", "button")
			  .attr("id", "newSample")
			  .attr("value", "New sample")
			  .attr("class", "button sampleBtn")
			  .on("click", function() {
				  // Prevent re-asking for UID after the
				  // following reload:
				  cookieMonster.setCookie("stats60Uid", logger.userId());
				  location.reload();
				  log("newSample");
				  })
			//.append('br');
	}
	
	/*---------------------------
	| blankDataStateLabels 
	-----------------*/
	
	var blankDataStateLabels = function( lastState ) {
		/*
		 * Given the name of the last state in
		 * a sample (i.e. the left-most state label
		 * on the X axis of the sample chart), set
		 * all the state-name X-labels to blank, except
		 * for that last one.
		 */

		let xAxisGrpSel = d3.select('#dataXAxisGrp'); 
		let txtSel      = xAxisGrpSel.selectAll("text");
		
			txtSel
		    		.attr('text', function(state) {
		    			if (state === lastState) {
		    				return state;
		    			} else {
		    				return '';
		    			}
		    		})
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
	| createSvgHeaders 
	-----------------*/
	
	var createSvgHeaders = function() {
		
		// Compute header placement svgData.
		
		let svgDataWidth      = d3.select("#dataSvg").node().getBoundingClientRect().width;
		let svgAllStatesWidth = d3.select("#allStatesSvg").node().getBoundingClientRect().width;
		
		svgData
			.append("text")
			  .text("Sample")
			  .attr("class", "sampleHeader")
			  .attr("text-anchor", "middle")
			  .attr("transform", `translate(${Y_AXIS_LEFT_PADDING + svgDataWidth / 2}, -30)`);
		
		let headerTxtSel = svgAllStates
			.append("text")
			  .text("Population")
			  .attr("class", "populationHeader")
			  .attr("text-anchor", "middle")
	   
		if ( browserType == 'Firefox1+') {		
			headerTxtSel.attr("transform", `translate(${Y_AXIS_LEFT_PADDING + svgAllStatesWidth / 2}, -20)`);
		} else {
			headerTxtSel.attr("transform", `translate(${Y_AXIS_LEFT_PADDING + svgAllStatesWidth / 2}, -30)`);
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
			d3.select('#allStatesDiv')
			break;
		case "step1":
			d3.select('#allStatesDiv')
			break;
		case "step2":
			d3.select('#allStatesDiv')
			break;
		case "reset":
			// Restore true birth rates:
			teenBirthObj = JSON.parse(JSON.stringify(origTeenBirthObj));
			// Restore original state sample:
			xDomain = xDomainSaved.map(function(el) { return el });
			// Remake the X axis, and redraw mean and CI bracket:
			replaceXAxis( xDomain, true );
			ensureRectHeights();			
			break;
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
var ciViz = ConfidenceViz(700, 400);

var bar = 10;	

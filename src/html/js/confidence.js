ConfidenceViz = function(width, height) {

	// Instance variables:

	var that             = null;  // Reference to this instance
	
	var width   	     = width;
	var height  	     = height;
	var scalesData	     = null;  // {xScale : <xScaleFunc>, yScale : <yScaleFunc>}
	var scalesAllStates  = null;  // {xScale : <xScaleFunc>, yScale : <yScaleFunc>}
	var dragClickHandler = null;
	var currBtn		 	 = null; // Currently active exercise-step button.

	// Constants:

	var X_AXIS_LEFT_PADDING      = 0;  // X axis distance left SVG edge
	var X_AXIS_BOTTOM_PADDING    = 70; // X axis distance bottom SVG edge  50
	var X_AXIS_RIGHT_PADDING     = 50; // X axis distance right SVG edge
	var Y_AXIS_BOTTOM_PADDING    = 80; // Y axis distance from SVG bottom
	var Y_AXIS_TOP_PADDING       = 10; // Y axis distance from SVG top
	var Y_AXIS_LEFT_PADDING	     = 60; // Y axis distance from left SVG edge
	
	var CI_LEFT_PADDING          = 10; // horizontal distance of conf interval bracket
									   // from all-states y axis:
	var CI_SMALL_EDGE_LEN        = 3;  // Small leg of the CI bracket
	
	var X_TOOLTIP_PADDING        = 100; // Fixed x position for tooltip
	
	var DOT_RADIUS               = 10;  // pixels.
	
	var NUM_SAMPLES              = 5;
	var ALL_STATE_MEAN           = null;
	
	var STATE_TBL = {Alabama : 'AL',
					 California : 'CA',
					 Georgia    : 'GA',
					 Nevada     : 'NV',
					 Mississippi: 'MS'
	}

	var teenBirthObj = {"Mississippi": 10.132693102023957, "Oklahoma": 9.111531899735652, "Delaware": 5.71454611738972, 
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
						"Washington": 4.658802280295761, "North Carolina": 6.932837363091548, "District of Columbia": 5.941739404774424, 
						"Texas": 8.888449743099713, "Nevada": 6.898859485234656, "Maine": 5.158292644510946, "Rhode Island": 5.451353598817334
						};
	
	// T-table for two-tailed, 95% critical value.
	// The leading zero is just so that we can index
	// into the tbl directly with the df:
	var tTbl2Tailed95 = [0, 12.706, 4.303, 3.182, 2.776, 2.571,
						 2.447, 2.365, 2.306, 2.262, 2.228, 2.201,
						 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101,
						 2.093, 2.086, 2.08, 2.074, 2.069, 2.064,
						 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
						 2, 1.98
						 ]
	
	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function() {
		
		// Find the div in which the chart is to reside,
		// and its dimensions:

		let chartDiv = document.getElementById('dataDiv');
			
		width  = chartDiv.clientWidth;
		height = chartDiv.clientHeight;

		// The "+40" is a kludge! It accounts
		// for the additional space that the x-axis
		// labels will take once they are rotated
		// 45 degrees: 
		d3.select('#dataDiv')
			.style("height", height + 40)
		
		svgData = d3.select("#dataDiv").append("svg")
		.attr("width", "100%")
		.attr("height", "100%")
		.attr("viewBox", `0 0 ${width} ${height}`)
		.attr("id", "dataSvg")
		.attr("class", "svgData")

		dragClickHandler = StatsBarchartResizeHandler(svgData);
		
        let yDomain     = [0, Math.max.apply(null, Object.values(teenBirthObj))];
        
        let xDomain     = sampleFromStates(NUM_SAMPLES); 
        
        // Argument for makeCoordSys:
        let extentDict  = {svg           : svgData, 
        				   x: {scaleType : 'ordinal',
        					   domain    : xDomain,
        					   axisLabel : 'US States',
        					 axisLabelId : 'dataXLabel'        						   
            				  },
            			   y: {scaleType : 'linear',
            				      domain : yDomain,
            				   axisLabel : 'Teen Pregnancy Rate',
            			     axisLabelId : 'dataYLabel'
            			      }
                          };

		scalesData = makeCoordSys(extentDict);
		
		// Generate bar chart for the chosen states:
        updateDataChart(xDomain, teenBirthObj, scalesData);
		
        
		// Build the all-states chart:
		
        let yDomainAllStates = [0, Math.max.apply(null, Object.values(teenBirthObj))];
        
        let xDomainAllStates = Object.keys(teenBirthObj);
        
        
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
		.attr("viewBox", `0 0 ${width} ${height}`)
		.attr("id", "allStatesSvg")
		.attr("class", "svgAllStates")
		
        extentDict  = {svg             : svgAllStates,
        			   x: {scaleType   : 'ordinal',
        				   domain      : xDomainAllStates,
        				   axisLabel   : 'US States',
        				   axisLabelId : 'allStatesXLabel',
        				   subclass    : 'allStates',          // styled separately.
        				  rightPadding : 5
            			  },
            		   y: {scaleType   : 'linear',
            		       domain      : yDomainAllStates,
        				   axisLabel   : 'Teen Pregnancies',
        				   axisLabelId : 'allStatesYLabel'
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
        
        let ci = computeConfInterval( { dataArr  	  : sampleTeenBirthRates,
        								populationSize: xDomainAllStates.length, // all states
        								makeSmallPopCorrection : true
        						     })		
        createCIViz(ci, scalesAllStates);        						     

        addControlButtons();
		
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
		
		// Get function barsDragged() 
		// a chance to see which bar moved, and to mirror
		// on the confidence interval chart:
		let dispatch = d3.dispatch('drag', barPulled);
		dispatch.on("drag.teenBirthBar", barPulled); //************
		
		d3.select('#dataSvg').selectAll('.sampleStateBar')
			// Data are the teen birth rates:
			//**** .data(statesToInclude.map(function(state) { return teenBirthObj[state] }))
			 .data(statesToInclude)
	      .enter().append('rect')
	      	.attr('class', 'teenBirthBar')
	      	.attr('id', function(state) { return 'dataBar' + state })
	      	.attr('x', function(state) { return xScale(state) })
	      	.attr('width', xScale.rangeBand())
	      	.attr('y', function(state) { return yScale(teenBirthObj[state]) + Y_AXIS_TOP_PADDING })
	      	.attr('height', function(state) { return (height - Y_AXIS_BOTTOM_PADDING) - yScale(teenBirthObj[state]) })
	      	// Attach drag-start behavior to this bar.
	      	//*****.call(addDragBehavior, scalesData);
	      	.call(d3.behavior.drag()
				.on('dragstart', function(d) {
					
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
					d3.behavior.drag.currBar = this;
					
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
						barSel = d3.select(d3.behavior.drag.currBar);
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
					dispatch.drag(this, barSel);
				})
				.on ('dragend', function(d) {
					d3.select(this).classed("dragging", false);
					d3.behavior.drag.currBar = undefined;
				}))
	}
	
	/*---------------------------
	| updateAllStatesChart
	-----------------*/

	var updateAllStatesChart = function(statesToInclude, teenBirthObj, scalesData) {
		
		let xScale = scalesData.xScale;
		let yScale = scalesData.yScale;
		
		d3.select('#allStatesSvg').selectAll('.allStatesBar')
			// Data are the teen birth rates:
			//**** .data(statesToInclude.map(function(state) { return teenBirthObj[state] }))
			 .data(statesToInclude)
	      .enter().append('rect')
	      	.attr('class', 'allStatesBar')
	      	.attr('id', function(state) { return 'allStatesBar' + state })
	      	.attr('x', function(state) { return xScale(state) })
	      	.attr('width', xScale.rangeBand())
	      	.attr('y', function(state) { return yScale(teenBirthObj[state]) + Y_AXIS_TOP_PADDING })
	      	.attr('height', function(state) { return (height - Y_AXIS_BOTTOM_PADDING) - yScale(teenBirthObj[state]) })
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
		// Accessor function for each data point:
		var lineFunction = d3.svg.line()
		                         .x(function(xyObj) { return xyObj.x; })
		                         .y(function(xyObj) { return xyObj.y; })
		                         .interpolate("linear");	

		let lineGraph = svgContainer.append("path")
		                            .attr("d", lineFunction(lineData))
		                            .attr("class", meanLineDict.lineClass);
	}
	
	/*---------------------------
	| computeConfInterval 
	-----------------*/
	
	var computeConfInterval = function( ciInfo ) {
		/*
		 * Returns object: { lowBound  : lowConfidenceIntervalBound,
		 * 					 highBound : highConfidenceIntervalBound,
		 *                 }
		 *                 
		 * Makes                
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
	| updateCIViz 
	-----------------*/

	var updateCIViz = function(ciObj) {
		
		let ciBracketSel = d3.select('#ciBracket');

	}
	
	/*---------------------------
	| createCIViz 
	-----------------*/
	
	var createCIViz = function(ciObj, scalesAllStates) {

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
		// Accessor function for each data point:
		var lineFunction = d3.svg.line()
		                         .x(function(xyObj) { return xyObj.x; })
		                         .y(function(xyObj) { return xyObj.y; })
		                         .interpolate("linear");	

		let lineGraph = d3.select('#allStatesSvg')
		                    .append("path")
		                       .attr("d", lineFunction(lineData))
		                       .attr("id", "#ciViz")
		                       .attr("class", "confIntLine");
	}
	
	/*---------------------------
	| newSample 
	-----------------*/
	
	var newSample = function( xDomain ) {

		let currSampleSize = xDomain.length;

		// Get one new state's teen birth rates:
		let remainingStates = Object.keys(teenBirthObj)
								   .filter(function(i) {
									   return xDomain.indexOf(i) < 0;
									   });
		
		let newState = sampleFromStates(1, remainingStates);
		xDomain.append(newState);
		updateDataChart(xDomain, teenBirthObj, scalesData);
		return xDomain;
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
		 *  	                       axisLabel : <axis description>
		 *  	                       subclass  : <additionalClass>             // optional
		 *  						 rightPadding: <padding-right px>            // optional
		 *  	                   },
		 *  	               y : {scaleType    : <linear | ordinal | time> },
		 *  	                       domain    : <[min,max]>                   // if linear scale
		 *  	                       domain    : <[ord1,ord2,...]>             // if ordinal scale
		 *  	                       axisLabel : <axis description>
		 *  	                       subclass  : <additionalClass>             // optional
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
		
		let xAxis     = null;
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
			xScale = d3.scale.linear()
							 .domain(extentDict.x.domain)
							 .range([Y_AXIS_LEFT_PADDING, width - X_AXIS_RIGHT]);
			break;
		case 'ordinal':
			xScale = d3.scale.ordinal()
							 .domain(extentDict.x.domain)
							 .rangeRoundBands([Y_AXIS_LEFT_PADDING, width - X_AXIS_RIGHT], 0.1);
							 
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
			yScale = d3.scale.linear()	
			 			 .domain(extentDict.y.domain)
						 .range([height - Y_AXIS_BOTTOM_PADDING, Y_AXIS_TOP_PADDING]);
			break;
		case 'ordinal':
			yScale = d3.scale.ordinal()
							 .domain(extentDict.y.domain)
							 .rangePoints([Y_AXIS_TOP_PADDING, height- Y_AXIS_BOTTOM_PADDING]);
			break;
		default:
			throw `Axis type ${extentDict.x.scaleType} not implemented.}`;
		}
		
		// Make the visual coordinate system:
		
		xAxis = d3.svg.axis()
				      .scale(xScale)
				      .orient("bottom");
				      
		// Create a group, and call the xAxis function to create the axis.
		let xAxisGroup = svg.append("g")
			 .attr("class", "axis")
			 .attr("transform", `translate(${X_AXIS_LEFT_PADDING}, ${height - X_AXIS_BOTTOM_PADDING})`)
		     .call(xAxis);
		
		if (typeof(extentDict.x.subclass) !== 'undefined' ) {
			xAxisGroup.classed(extentDict.x.subclass, true)
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
		    	.attr("y", 5)
		    	.attr("x", 0)
		    	//.attr("dy", "-0.35em")
		    	.attr("transform", "rotate(45)")
		    	.style("text-anchor", "start")
		}
		
		/* ---------------------------- Y AXIS ---------------------------- */		
		
		yAxis = d3.svg.axis()
				      .scale(yScale)
				      .orient("left");
		
		// Create a group, and call the xAxis function to create the axis:
		svg.append("g")
			 .attr("class", "axis")
			 //.attr("transform", "translate("[Y_AXIS_LEFT_PADDING + (height - Y_AXIS_TOP_PADDING) + ")")	
			 .attr("transform", `translate(${Y_AXIS_LEFT_PADDING}, ${Y_AXIS_TOP_PADDING})`)	
		     .call(yAxis);

		if (typeof(extentDict.y.subclass) !== 'undefined' ) {
			xAxisGroup.classed(extentDict.x.subclass, true)
		}
		
		
		/* -------------------------- Axis Labels (for Axes themselves, not ticks) ----------- */
		
		xAxisLabel = svg.append("text")
						.attr("class", "x label")
						.attr("id", extentDict.x.axisLabelId)
						.attr("text-anchor", "middle")
						.attr("x", width / 2.0)
						//*****.attr("y", height - X_AXIS_BOTTOM_PADDING - 6)
						.attr("y", height + 8)
						.text(extentDict.x.axisLabel)
						
		yAxisLabel = svg.append("text")
						.attr("class", "y label")
						.attr("id", extentDict.y.axisLabelId)
						.attr("text-anchor", "end") // I'm still confused about x/y of rotated text:
						.attr("x", - (height / 4.))  // The "/3." is empirical...
						.attr("y", Y_AXIS_LEFT_PADDING / 2)
						.attr("transform", "rotate(-90)")
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
	
	var barPulled = function(barObj, dataBarSel) {
		/*
		 * Called when a data bar is dragged. Finds the
		 * confidence interval chart, and echoes
		 * the move.
		 */
		
//		//console.log(`Circle class: ${dataCircleSel.attr('class')}`);
//		// Given the data point find the correlation point 
//		// that is the same US state; the data point that
//		// moved might be a 1996 point or a 2014 pont:
//		if (["category1Dot", "category2Dot"].some(function(className) { return dataCircleSel.classed(className) })) {
//
//			let state = dataCircleSel.attr('state'); // US State
//			let corrCircleSel     = d3.select(`#${dataCircleSel.attr('state')}`);
//			let corrCircleGrp     = corrCircleSel.node().parentNode;
//			let corrLabelSel      = d3.select(corrCircleGrp).select('text');
//
//			// Was the 1996 dot of the state moved, 
//			// or the 2016 dot?
//			// tblRows will have only one val: the 
//			// year-row for the data circle. tblRow
//			// will be something like the string "[1]":
//			// get the '1' from that string:
//			let tblRow  	      = JSON.parse(dataCircleSel.attr('tblRows'))[0]; 
//			let tblCol  	      = parseInt(dataCircleSel.attr('tblCol'));
//			let targetUserVal     = tblObj.getCell(tblRow, tblCol + 1); // tblCol-0 is year col
//			let currCx            = parseFloat(corrCircleSel.attr('cx'));
//			let currCy            = parseFloat(corrCircleSel.attr('cy'));
//			let currLabelX        = parseFloat(corrLabelSel.attr('x'));
//			let currLabelY        = parseFloat(corrLabelSel.attr('y'));
//			let dx                = 0;
//			let dy                = 0;
//			if (tblRow == 0) {
//				// Was 1996-data point, so corr x-axis is affected:
//				dx = scalesCorr.xScale(targetUserVal) - currCx + X_AXIS_LEFT_PADDING;
//				let newCircleX = currCx + dx;
//				let newLabelX  = currLabelX + dx;
//				corrCircleSel.attr('cx', newCircleX);
//				corrLabelSel.attr('x', newLabelX)
//			} else {
//				dy = scalesCorr.yScale(targetUserVal) - currCy + Y_AXIS_TOP_PADDING;
//				let newCircleY = currCy + dy;
//				let newLabelY  = currLabelY + dy;
//				corrCircleSel.attr('cy', newCircleY);
//				corrLabelSel.attr('y', newLabelY);
//			}
////***			d3.select(corrCircleGrp)
////***				.attr('transform', `translate(${dx}, ${dy})`);
//		}
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
		
/*		d3.select(".controlButtonBar")
			.append('input')
			  .attr("type", "button")
			  .attr("id", "step3")
			  .attr("value", "Step 3")
			  .attr("class", "button cntBtn");
*/		
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
		goToStep(homeBtn);
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
			
			//updateDataChart(scalesData);
			break;
		}
	}
	
	
	return constructor(width, height);
}
var ciViz = ConfidenceViz(700, 400);
var bar = 10;	
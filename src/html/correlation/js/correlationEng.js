/*
 * TODO:
 *  o States are cut off in data chart on Windows (firefox)
 *  o Turn data chart into barchart
 *  o Add new chart a la Lucas
 */

/*
 *   		return {headerRow : ['State', 'Alabama', 'California', 'Georgia',  'Mississippi', 'Nevada'],
 *		    data      : [['1996', 10.4, 9.1, 9.5, 11.1, 13.7],
 *					     ['2014', 5.7, 4.4, 5.7, 8.6, 6.0]
 *
 */

import { TableManager } from "./../../utils/js/tableManager.js";
import { StatsDragClickHandler } from "./../../utils/js/statsDragClickHandler.js";
import { SoftAlert } from "./../../utils/js/softAlerts";
import { CookieMonster } from "./../../utils/js/cookieMonster";
import { Logger } from "./../../utils/js/logging";
import * as ss from "./../../utils/js/simple-statistics.min";
import * as d3 from "./../../utils/js/d3.min";

var CorrelationViz = function(width, height) {

	// Instance variables:

	var that             = null;  // Reference to this instance
	
	var width   	     = width;
	var height  	     = height;
	var scalesData	     = null;  // {xScale : <xScaleFunc>, yScalse : <yScaleFunc>}
	var scalesCorr       = null;  // {xScale : <xScaleFunc>, yScalse : <yScaleFunc>}
	var tblObj  	     = null;
	var corrTxtEl        = null;
	var dragClickHandler = null;
	var currBtn		 	 = null; // Currently active exercise-step button.

	var svgData			 = null;
	
	var alerter          = null;
	var logger           = null;
	var cookieMonster    = null;
	var browserType      = null;
	
	// Constants:

	var X_AXIS_LEFT_PADDING      = 0;  // X axis distance left SVG edge
	var X_AXIS_BOTTOM_PADDING    = 50; // X axis distance bottom SVG edge
	var X_AXIS_RIGHT_PADDING     = 50; // X axis distance right SVG edge
	
	var Y_AXIS_BOTTOM_PADDING    = 60; // Y axis distance from SVG bottom
	var Y_AXIS_TOP_PADDING       = 10; // Y axis distance from SVG top
	var Y_AXIS_LEFT_PADDING	     = 60; // Y axis distance from left SVG edge
	
	var X_TOOLTIP_PADDING        = 100; // Fixed x position for tooltip
	
	var CORR_TXT_POS             = {x : Y_AXIS_LEFT_PADDING + 30,
									y : Y_AXIS_TOP_PADDING  + 30
									};
	
	var UPDATE_TABLE             = true;
	var DONT_UPDATE_TABLE        = false;
	
	var DOT_RADIUS               = 10;  // pixels.
	
	var STATE_TBL = {Alabama : 'AL',
					 California : 'CA',
					 Georgia    : 'GA',
					 Nevada     : 'NV',
					 Mississippi: 'MS'
	}

	
	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function() {
		
		// For non-modal alerts:
		alerter     = SoftAlert();
		cookieMonster = CookieMonster();
		
		let uid = cookieMonster.getCookie("stats60Uid");
		if ( uid !== null ) {
			logger = Logger(alerter, uid, false);    // false: dont' authenticate 
			logger.setUserId(uid);
			cookieMonster.delCookie("stats60Uid");
		} else {
			//*******logger = Logger(alerter);
			logger = Logger(alerter, null, false); // REMOVE AFTER DEBUGGING TO RESTORE LOGIN!!!
		}
		browserType = logger.browserType();
		
		
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
		.attr("id", "dataChart")
		.attr("class", "svgData")


		dragClickHandler = StatsDragClickHandler(svgData);
		
		// Don't allow creation of new dots by clicking:
		dragClickHandler.setAllowDotCreation(false);

        tblObj = createTable();
        tblObj.classed({table: 'inputTable'});
        document.getElementById('tableDiv').appendChild(tblObj.value());
        
        // From the (y-) data of the table, get 
        // the maximum murder amount:
        let nestedData  = tblObj.getData();
        let flatData    = [].concat.apply([], nestedData);
        // Exclude the col-0 years:
        let numericData = flatData.filter(function(item) {return typeof(item) === 'number'});
        let yDomain     = [0, Math.max.apply(null, numericData)];
        
        // X axis is months without the col-0 header 'State':
        let xDomain     = tblObj.getHeader().slice(1);
        
        // Argument for makeCoordSys:
        let extentDict  = {svg           : svgData, 
        				   x: {scaleType : 'ordinal',
        					   domain    : xDomain,
        					   axisLabel : 'US States',
        					 axisLabelId : 'dataXLabel',
        					 axisGrpName : 'dataXAxisGrp'        					 
        				   },
            			   y: {scaleType : 'linear',
            				      domain : yDomain,
            				   axisLabel : 'Murders per 100K People',
            			     axisLabelId : 'dataYLabel',
            			     axisGrpName : 'dataYAxisGrp'            			     
            			   }
                          };

		scalesData = makeCoordSys(extentDict);
		
		// Build the correlations chart:
		
		// The "+40" is a kludge! It makes the 
		// svg height of the correlation chart
		// match the kludge needed for the data svg
		// height:
		d3.select('#corrDiv')
			.style("height", height + 40)
			.attr("class", "corrDiv");

		
		
		let svgCorr = d3.select("#corrDiv").append("svg")
		.attr("width", "100%")
		.attr("height", "100%")
		.attr("viewBox", `0 0 ${width} ${height}`)
		.attr("id", "corrChart")
		.attr("class", "svgCorr")
		
		// The categories of dots ("1996", "2014")
		let dataCat1 = tblObj.getCell(0, 0);
		let dataCat2 = tblObj.getCell(1, 0);
		
        extentDict  = {svg             : svgCorr,
        			   x: {scaleType   : 'linear',
        				   domain      : yDomain,
        				   axisLabel   : 'Murders per 100K in ' + dataCat1,
        				   axisLabelId : 'corrXLabel',
        				  axisGrpName  : 'corrXAxisGrp'        					   
            			  },
            		   y: {scaleType   : 'linear',
            		       domain      : yDomain,
        				   axisLabel   : 'Murders per 100K in ' + dataCat2,
        				   axisLabelId : 'corrYLabel',
        				  axisGrpName  : 'corrYAxisGrp'        					   
            		      }
                       };

		scalesCorr = makeCoordSys(extentDict);
		
		// Move the correlation x-axis label below
		// the axis:
		
		let corrXLabelY = parseFloat(d3.select('#corrXLabel').attr('y'));
		d3.select('#corrXLabel').attr('y', corrXLabelY + 50);
		
		// Initialize the data chart, which 
		// will initialize the correlation chart
		// as well:
		updateDataChart(scalesData);
		placeCorrelationValue();
		
		// Make correlation dots match:
		updateCorrChart(scalesCorr);
		
		// Create tooltips. Pass the
		// x/y scales and the 1996/2014 category strings:
		addCorrTooltip(scalesCorr, {xCat : dataCat1, yCat : dataCat2});
		
		// Add the statlet control buttons at the top:
		addControlButtons();
		
		return {width  : width,
				height : height,
				tblObj : tblObj,
			}
	}
	

	/*---------------------------
	| getTrueData 
	-----------------*/
	
	var getTrueData = function() {
		/*
		 * Returns an object containing 
		 * the header row, and a matrix with
		 * the data.
		 */
		
		return {headerRow : ['State', 'Alabama', 'California', 'Georgia',  'Mississippi', 'Nevada'],
			    data      : [['1996', 10.4, 9.1, 9.5, 11.1, 13.7],
					         ['2014', 5.7, 4.4, 5.7, 8.6, 6.0]
		                 	 ]
		}
	}
	
	/*---------------------------
	| createTable 
	-----------------*/
	
	var createTable = function() {
/*		let headerRow = ['Spender', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 
		                 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
*/		                 
		//let data      = [['Monica', 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
		//                 ['Daniel', 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125]
		//				]
		
		let allData   = getTrueData();
		let headerRow = allData.headerRow;
		let data      = allData.data;

// For alternative, random placement:		
/*		for (let i=0; i<12; i++) {
			data[0].push(Math.round(100*Math.random()));
			data[1].push(Math.round(100*Math.random()));
		}
*/		
		tblObj = TableManager(data, headerRow);
		tblObj.classed({table : 'inputTable',
						 cell : ['largeLabel', undefined, 0]
						});
		return tblObj;
	}
	
	/*---------------------------
	| updateDataChart 
	-----------------*/
	
	var updateDataChart = function(scaleInfo) {
		
		/*
		 * Scales is an object with three properties: xScale and yScale,
		 * and bandWidth, the width between x-ticks in pixels.
		 */
		
		let xScale    = scaleInfo.xScale;
		let yScale    = scaleInfo.yScale;
		let bandWidth = scaleInfo.bandWidth; 
		
		// Get header (months), and data without the
		// 'Spender', 'Monica', 'Daniel' column:
		
		let states      = tblObj.getHeader().slice(1);
		
		let dotClasses  = ['category1Dot', 'category2Dot'];
		
		let NO_HEADER_ROW = false;
		let NO_COL0       = false;

		let currRowNum = -1;
				
		svgData
		  .data(function() { return tblObj.getData(NO_HEADER_ROW, NO_COL0) }); // matrix

		// For each row of the matrix: create or update 
		// dots, giving the dots of each row a different
		// CSS class. This loop should be doable as pure D3,
		// but I couldn't get the 'outer' loop (i.e. outer selection)
		// to run through all rows:
		for (let row of tblObj.getData(NO_HEADER_ROW, NO_COL0)) {
			
			let dotClass = dotClasses[++currRowNum];
			let colNum = 0;

			let stateDotSel = svgData.selectAll('.' + dotClass)
				.data(function() { return row });
			
			stateDotSel
 				    // Update existing dots with (possibly) changed data:
				   	.transition('resettingX')
				   		.delay(0.1)
				   		.duration(800) // ms
				   		.attr('cx', function(d, colNum)  { return xScale(states[colNum]) + Math.round(bandWidth / 2.0) })
				   	.transition('resettingY')
				   		.delay(0.1)
				   		.duration(800) // ms
				   		.attr('cy', function(d)  { return yScale(d) + Y_AXIS_TOP_PADDING }) // one row element at a time
				   		
			stateDotSel.enter() 
				 // Add additional dots if now more data than before:
				   .append("circle")
				      .attr("state",  function(row, i) { return states[i] })
				      .attr("id", function(row, i) { return states[i] + tblObj.getCell(currRowNum, 0) }) // Year of murders
				      .attr("tblRows", function() { return `[${currRowNum}]` })   // Only one table row is involved
				      .attr("tblCol", function() { return colNum++ } )
				      .attr("r", DOT_RADIUS)                                                     // to which this circle belongs.
				      .attr("cx", function(d,colNum)  { return xScale(states[colNum]) + Math.round(bandWidth / 2.0) })
				      .attr("cy", function(d, colNum) { return yScale(d) + Y_AXIS_TOP_PADDING }) // one row element at a time
				      .attr("class", function() { return dotClass } )
				      // Attach drag-start behavior to this circle.
				      // Do update the data table from these moves.
				      .call(addDragBehavior(dotClasses, yScale, xScale, {vertical: true, horizontal: false}, UPDATE_TABLE));

			let stickData = []
			
			d3.selectAll(`circle.${dotClass}`)
				.each(function() {
					let circle = this;
					stickData.push({"x1" : circle.cx.baseVal.value, "y1" : circle.cy.baseVal.value,
								    "x2" : circle.cx.baseVal.value, "y2" : height - X_AXIS_BOTTOM_PADDING,
									"state" : d3.select(circle).attr("state"),
									"circle" : this
								   }
					)}
				);

			let stateStickSel = svgData.selectAll('.' + dotClass + "Stick")
					.data(stickData)
					
  				    // Update existing sticks:
				
					.attr("y1", function(stickEl) {
						return stickEl.circle.cy.baseVal.value;
					})

				    .enter()
				       .append("line")
				   	      .attr("x1", function(stickEl) {
				   	    	  return stickEl.x1;
				   	      })
				   	      .attr("y1", function(stickEl) {
				   	    	  return stickEl.y1;
				   	      })
				   	      .attr("x2", function(stickEl) {
				   	    	  return stickEl.x2;
				   	      })
				   	      .attr("y2", function(stickEl) {
				   	    	  return stickEl.y2;
				   	      })
				   	      .attr("class", dotClass + "Stick")
				   	      .attr("state", function(stickEl) {
				   	    	  return stickEl.state;
				   	      })
				   	      .attr("id", function(stickEl) {
				   	    	  let id = stickEl.circle.id + "Stick";
				   	    	  // Add id of this stick to the corresponding
				   	    	  // circle for easy association:
				   	    	  d3.select(stickEl.circle).attr("stick", id);
				   	    	  return id;
				   	      })
					
		}
		
		// If legend does not yet exist, create a legend,
		// else done:
		
		if (d3.selectAll('.legend').empty()) {
			addLegend(dotClasses);
		}

	};
	
	/*---------------------------
	| updateCorrChart 
	-----------------*/
	
	var updateCorrChart = function(scaleInfo) {
		
		/*
		 * scalesInfo is an object with three properties: xScale and yScale,
		 * and bandWidth, the width between x-ticks in pixels.
		 */
		
		let xScale    = scaleInfo.xScale;
		let yScale    = scaleInfo.yScale;
		let bandWidth = scaleInfo.bandWidth; 
		
		// Get header (states), and data without the
		// year, '1996', '2014' column:
		
		let states      = tblObj.getHeader().slice(1);
		
		let dotClasses  = ['corrDot'];
		
		let NO_HEADER_ROW = false;
		let NO_COL0       = false;

		let currRowNum = -1;
		
		/*
	        From: [
	               [1996, murdersAlabama1996,  murdersCalifornia1996,...],
	               [2014, murdersAlabama2014,  murdersCalifornia2014,...]
	               ]
	        get: ['1994', '2014']
		 */
		let categories = tblObj.getCol(0); 
		let tblData    = tblObj.getData(NO_HEADER_ROW, NO_COL0);
		
		
		// Get current data from the table:
		
		/* Turn the table [[murdersAlabama1996, murdersCalifornia1996, ...],
		                   [murdersAlabama2014, murdersCalifornia2014, ...]
		                  ]
		   into:
		           [[murdersAlabama1996   , murdersAlabama2014],
		            [murdersCalifornia2014, murdersCalifornia2014]
		            ]
		                
        */		                
		let byYear = [];
		for (let stateIndex=0; stateIndex<tblData[0].length; stateIndex++) {
			byYear.push({ yearXAxis : tblData[0][stateIndex], 
						  yearYAxis : tblData[1][stateIndex]
						});
		}

		let ROW_1996 = 0;
		let ROW_2014 = 1;

		let stateIndex = 0;
		
		d3.select('#flexWrapper #corrChart').selectAll('g circle')		
		 .data(byYear)
             // Update already-existing (possibly) changed dots:
             .attr('cx', function(byYearPair) { return xScale(byYearPair.yearXAxis) + X_AXIS_LEFT_PADDING } )
    	     .attr('cy', function(byYearPair) { return yScale(byYearPair.yearYAxis) + Y_AXIS_TOP_PADDING } )
    	     
	     .enter()
	        .append('g')
	        .attr('class', 'corrDotGrp')
	        .append('circle')
             .attr('cx', function(byYearPair) { return xScale(byYearPair.yearXAxis) + X_AXIS_LEFT_PADDING } )
    	     .attr('cy', function(byYearPair) { return yScale(byYearPair.yearYAxis) + Y_AXIS_TOP_PADDING } )
	    	 .attr('state', function(d, i) {
	    		  return states[i] 
	    	   })
	    	 .attr('id', function(d, i) {
	    		 return states[i] 
	    	   })		    
	    	 .attr('tblRows', function() { return `[${ROW_1996}, ${ROW_2014}]` })
	    	 .attr('tblCol', function(dummy, i) { return i } )
			 .attr('cx', function(byYearPair) { return xScale(byYearPair.yearXAxis) + X_AXIS_LEFT_PADDING } )
			 .attr('cy', function(byYearPair) { return yScale(byYearPair.yearYAxis) + Y_AXIS_TOP_PADDING } )
			 .attr('r', DOT_RADIUS + 2)
			 .attr('class', 'corrDot');
		
			let circleTxtGrpSel = d3.select('#flexWrapper #corrChart').selectAll('.corrDotGrp');
			// If called the first time, no dot-texts (state abbreviations) 
			// have been created, just the groups and a circle inside:
			let noLabelsCreated = circleTxtGrpSel.select('text').empty();
			
			if ( noLabelsCreated ) {
				circleTxtGrpSel
				// 'this' will be an existing group:
				.each(function(byYearPair, byYearIndx) {
					let	grpSel   = d3.select(this);
					let dotSel   = grpSel.select('circle');
					let dotState = dotSel.attr('state');
					grpSel
					  .append('text')
			    		  .text(STATE_TBL[dotState])            // State abbreviation
			    		  .attr('text-anchor', 'middle')        // For centering within the circle
			    		  .attr('dominant-baseline', 'middle')  // horizontally and vertically.
			    		  .attr('x', function() {               // Center text over circle. 
			    		  	return dotSel.attr('cx');
			    		  })
			    		  .attr('y', function() {
			    		  	return parseFloat(dotSel.attr('cy'))
			    		  })
			    		  .attr('class', 'corrStateLabelTxt');
				});
			} else {
				circleTxtGrpSel.selectAll('text')
					.each(function(byYearPair, byYearIndx) {
						let	grpSel   = d3.select(this.parentNode);
						let dotSel   = grpSel.select('circle');
						// Select the state abbreviation label:
						d3.select(this)
						   .attr('x', function() {               // Center text over circle. 
							     return dotSel.attr('cx');
						   		})
						   .attr('y', function() {
							     return parseFloat(dotSel.attr('cy'))
						   		});
					});
			}
		
			// Make the state abbreviation labels non-selectable:
			d3.selectAll('.corrStateLabelTxt').classed('unselectable', true);
			
			let corrGrpSel = d3.selectAll('.corrDotGrp');
			corrGrpSel
			  .on("mouseover", function() {
			  	// 'This' is the group:
			  	let theDotSel       = d3.select(this).select('circle');
			  	let tooltipName     = theDotSel.attr('tooltipGrpName');
			  	let tooltipSel      = d3.select('#' + tooltipName);
			  	let tooltipRecSel   = tooltipSel.select('rect');
			  	let tooltipLabelSel = tooltipSel.select('text');
			  	
			  	// Find highest corr dot (i.e. lowest y-value),
			  	// and place tooltip just above that dot:
			  	let minY = parseFloat(theDotSel.attr('cy'));
			  	d3.selectAll('.corrDot').each(function(dotSel) {
			  		let thisY = parseFloat(d3.select(this).attr('cy')); 
			  		if ( thisY < minY) 
			  			minY = thisY;
			  	})
			  	
			  	let currRectY    = parseFloat(tooltipRecSel.attr('y'));
			  	let dy           = minY - currRectY;
			  	let targetRectY  = currRectY + dy;
			  	
			  	let currLabelY   = parseFloat(tooltipLabelSel.attr('y'));
			  	let targetLabelY = currLabelY + dy;

			  	tooltipRecSel.attr('x', X_TOOLTIP_PADDING);
			  	tooltipRecSel.attr('y', targetRectY);
			  	
			  	tooltipLabelSel.attr('x', X_TOOLTIP_PADDING);
			  	tooltipLabelSel.attr('y', targetLabelY);
			  	
			  	tooltipSel.classed('visible', true);
			  })
			  .on("mouseout", function() {
			  	// 'This' is the group:
			  	let theDotSel    = d3.select(this).select('circle');
			  	let tooltipName  = theDotSel.attr('tooltipGrpName');
			  	let tooltipSel   = d3.select('#' + tooltipName);
			  	tooltipSel.classed('visible', false);
			  })
	}
	
	/*---------------------------
	| addDragBehavior 
	-----------------*/
	
	
	var addDragBehavior = function(dotClasses, yScale, xScale, dragDirections, updateTable) {
		/*
		 * Adds drag behavior to 'this'. In order to 
		 * have 'this' bound to the object to which the 
		 * behavior is to be attached, use the addDragBehavior.call(),
		 * or from a D3 expression: .call(addDragBehavior).
		 * Does not return anything. 
		 * 
		 * :param dotClasses: array of CSS class names of dots that 
		 *         will get moved around. Example: ['category1Dot', 'category2Dot]
		 *         for the data chart. Or just ['corrDot'] for the 
		 *         correlation dot. Used to ensure we don't start moving
		 *         other items in the chart than dots.
		 * :type dotClasses: [str]
		 * :param yScale: the  D3 yScale function of the chart.
		 * :type yScale: function
		 * :param xScale: Optionally the x-axis scale, if dots can move both
		 * 			up/down and left/right. Horizontal motion might be 
		 *          suppressed, for example, if the X axis is ordinal. 
		 * :type xScale: { function | undefined }
		 * :param dragDirections: Object with all-optional properties
		 *           vertical, horizontal. If none is present in the object,
		 *           then dragging is allowed both vertically and horizontally.
		 *           Else the boolean values of properties vertical/horizontal
		 *           determine which motions are allowed.
		 * :type dragDirections: { vertical : boolean &| horizontal : boolean &| <empty> }
		 * :param updateTable: change content of table cells as dragged elements move.
		 * :type updateTable: bool
		 */
	
		// Get function circleDragged() 
		// a chance to see which circle moved, and to mirror
		// on the correlation chart:
		let dispatch = d3.dispatch('drag', circleDragged);
		dispatch.on("drag.dataDot", circleDragged);
										

		return d3.drag()
				.on('start', function(d) {
					
					// D3-select the DOM element that's trying
					// to be dragged:
					let circleSel = d3.select(this);
					
					// Is the element one of our circles?
					if (dotClasses.indexOf(circleSel.attr('class')) === -1) {
						// Was running mouse over something other than
						// one of our circles:
						return;
					}
					
					// Allow us to style a moving circle if we want:
					circleSel.classed("dragging", true);

					// Remember the circle that's in motion:
					d3.drag.currCircle = this;
					
				})
				.on('drag', function(d) {
					let circleSel = d3.select(this);
					if (circleSel.empty()) {
						// Not over a circle:
						return;
					} 
					
					let mouseY  = d3.event.y;
					let circleY = circleSel.attr('cy');
					let circleR = circleSel.attr('r');
					
					if (Math.abs(mouseY - circleY) > circleR) {
						// Mouse got ahead of the dragged circle.
						// Select the circle we are dragging instead:
						circleSel = d3.select(d3.drag.currCircle);
						if (circleSel.empty()) {
							// Not over a circle:
							return;
						} 
					}
					
					if (typeof(xScale) !== 'undefined' ) {
						let mouseX  = d3.event.x;
						let circleX = circleSel.attr('cx');
						let circleR = circleSel.attr('r');

						if (Math.abs(mouseX - circleX) > circleR) {
							// Mouse got ahead of the dragged circle.
							// Select the circle we are dragging instead:
							circleSel = d3.select(d3.drag.currCircle);
							if (circleSel.empty()) {
								// Not over a circle:
								return;
							} 
						}
					}
					
					if (! circleSel.classed("dragging")) {
						// Not over something being dragged:
						return;
					}
					
					handleDrag(circleSel, yScale, xScale, dragDirections, updateTable);
					// Let interested parties know that a circle moved.
					// Used to sync (synchronize) corr chart with data chart:
					dispatch.call("drag", this, circleSel);
				})
				.on ('end', function(d) {
					d3.select(this).classed("dragging", false);
					d3.drag.currCircle = undefined;
				})
	}
	
	/*---------------------------
	| addLegend
	-----------------*/
	
	var addLegend = function(dotClasses) {
		
		let categoryColorObjs = [];
		let dataSeriesCategoryIndx = 0; 
		for (let dotClass of dotClasses) {
			let rgb = d3.selectAll('.' + dotClass).style('fill');
			let dataCat = tblObj.getCell(dataSeriesCategoryIndx++, 0);
			categoryColorObjs.push({category : dataCat, rgb : rgb});
		}

		let LEGEND_X_PADDING = Y_AXIS_LEFT_PADDING / 3.; // px from left
		let LEGEND_Y_PADDING = height - 20; // px from top
		let LEGEND_RECT_SIZE = 12; // sides of legend rects
		let LEGEND_SPACING = 4;    // vertical space betw. legend rows.
		let LEGEND_TXT_RECT_GAP = 3 // gap between legend text and its rectangle swatch
		
		// Create as many groups as there are categories (colors) of data:
		let legendSel = svgData.selectAll('.legend')
			.data(categoryColorObjs)
			.enter()
		  .append("g")
			.attr("class", "legend")
			.attr("id", categoryColorObjs.category)
			.attr("rectColor", categoryColorObjs.rgb)
		  	.attr('transform', function(d,i) {
		  		let yOffset = LEGEND_Y_PADDING + i * LEGEND_RECT_SIZE + i * LEGEND_SPACING;
		  		return `translate(${LEGEND_X_PADDING}, ${yOffset})`
		  	})
		  	
		// Insert legend text into each group:
		legendSel
		  .insert("text")
		    .text(function(catColorObj,i) {
		    	return catColorObj.category;
		    	})
		    .attr("class", "legendText")
		// Insert a colored legend rectangle swatch into each group:
		legendSel 
		  .insert("rect")
		  	.attr('height', LEGEND_RECT_SIZE) 
		  	.attr('width', LEGEND_RECT_SIZE)
		  	.attr('transform', function(catColorObj,i) {
		  		// this is rect:
		  		let legendTextElHeight = this.previousSibling.clientHeight;
		  		// Align middle of rect with middle of text. the /4 is
		  		// empirically determined. Unsure of all the measurements
		  		// involved that would make this precise:
		  		let txtRect = this.previousSibling.getBoundingClientRect();
		  		//let vertTxtMiddle = txtRect.bottom - (txtRect.height / 2.);
		  		let yOffset = - LEGEND_RECT_SIZE + LEGEND_RECT_SIZE / 4.
		  		return `translate(${txtRect.width + LEGEND_TXT_RECT_GAP}, ${yOffset})`;
		  	})
		  	.attr('fill', function(catColorObj, i) {
		  		return catColorObj.rgb;
		  	})
		  	
		d3.selectAll('.legendText').classed('unselectable', true);
	}
	
	/*---------------------------
	| handleDrag
	-----------------*/
	
	var handleDrag = function(d3CircleSel, yScale, xScale, dragDirections, updateTable) {
		/*
		 Find this dot's corresponding table cell
		 Find new y-position in table coordinates.
		 update the table. Call updateCorrelationValue()
		 to update the Pearson's r on the data chart.
		 
		 :param d3CircleSel: D3 selection of a single element to be moved.
		 :type d3CircleSel: D3Selection
		 :param yScale: D3 scale for y axis
		 :type yScale: D3Scale
		 :param xScale: D3 scale for x axis
		 :type xScale: D3Scale
		 :param dragDirections: Object with all-optional properties
		            vertical, horizontal. If none is present in the object,
		            then dragging is allowed both vertically and horizontally.
		            Else the boolean values of properties vertical/horizontal
		            determine which motions are allowed.
		 :type dragDirections: { vertical : boolean &| horizontal : boolean &| <empty> }
		 :param updateTable: if true, the table in the UI will be updated to reflect
		 			the new circle position. 
		 :param updateTable: bool
		 
		 */
		
		let vertMove = true;
		let horMove  = true;
		if (dragDirections.hasOwnProperty('vertical')) {
			vertMove = dragDirections.vertical;
		}
		if (dragDirections.hasOwnProperty('horizontal')) {
			horMove = dragDirections.horizontal;
		}
		
		let tblRows = JSON.parse(d3CircleSel.attr('tblRows'));
		// The +1: skip col0, which is the spender's name:
		let tblCol = parseInt(d3CircleSel.attr('tblCol')) + 1;

		if (updateTable) {
			for (let tblRow of tblRows) {
				if (vertMove) {
					let userFrmY  = yScale.invert(d3.event.y - Y_AXIS_TOP_PADDING);
					tblObj.setCell(tblRow, tblCol, userFrmY.toFixed(2));		
				}
				if (horMove) {
					let userFrmX  = xScale.invert(d3.event.x - X_AXIS_LEFT_PADDING);
					tblObj.setCell(tblRow, tblCol, userFrmY.toFixed(2));		
				}
			}
		}
		
		// Update correlation:
		placeCorrelationValue();
		
		dragClickHandler.dragmove(d3CircleSel, vertMove, horMove);
		
		// Adjust height of stick to end in the circle again. Circles
		// include an attr "stick" with their stick name:
		let stickSel = d3.select("#" + d3CircleSel.attr("stick")) 
		stickSel.attr("y1", function() {
			return d3CircleSel.attr("cy");
		})
	}
	
	/*---------------------------
	| placeCorrelationValue 
	-----------------*/
	
	var placeCorrelationValue = function() {
		
		// The slices are to exclude the person names
		// in col 0:
		let pers1Data = tblObj.getRow(0).slice(1);
		let pers2Data = tblObj.getRow(1).slice(1);
		let corr      = ss.sampleCorrelation(pers1Data, pers2Data);
		let roundedCorr = +corr.toFixed(2); // The '+' suppresses unnecessary trailing zero, if present.
		
		if (corrTxtEl === null) {
			//Add the SVG Text Element to the svgContainer
			corrTxtEl = svgData.append("text")
							.attr('x', CORR_TXT_POS.x)
							.attr('y', CORR_TXT_POS.y)
							.attr('class', 'statsLabel');
		}
		corrTxtEl.text(`r: ${roundedCorr}`)

		d3.select('.statsLabel').classed('unselectable', true);
		
	}
	
	/*---------------------------
	| makeCoordSys 
	-----------------*/
	
	var makeCoordSys = function(extentDict) {
		
		/*
		 * extentDict: {
		 *                x : {scaleType : <linear | ordinal | time> },
		 *                        domain : <[min,max]>                   // if linear scale
		 *                        domain : <[ord1,ord2,...]>             // if ordinal scale
		 *                        axisLabel : <label of x axis as a whole>
		 *                    },
		 *                y : {scaleType : <linear | ordinal | time> },
		 *                         domain: <[min,max]>                   // if linear scale
		 *                         domain: <[ord1,ord2,...]>             // if ordinal scale
		 *                         axisLabel : <label of y axis as a whole>
		 *             }
		 *             
		 * Returns an object with three properties: xScale, yScale,
		 * and bandWidth, the width in pixels between two x-axis ticks.
		 */
		
		/* ---------------------------- X AXIS ---------------------------- */		

		let svg = extentDict.svg;
		
		let xAxis     = null;
		let yAxis     = null;
		let xScale    = null;
		let yScale    = null;
		let bandWidth = null; // width in pixels between two x-axis ticks.

		
		// X Scale:
		
		let X_AXIS_RIGHT = X_AXIS_RIGHT_PADDING;

		if (typeof extentDict.x.rightPadding !== 'undefined') {
			X_AXIS_RIGHT = extentDict.x.rightPadding;
		}

		// X Scale:

		switch (extentDict.x.scaleType) {
			case 'linear':
				xScale = d3.scaleLinear().domain(extentDict.x.domain).range([Y_AXIS_LEFT_PADDING, width - X_AXIS_RIGHT]);
				break;
			case 'ordinal':
				xScale = d3.scaleBand().domain(extentDict.x.domain).rangeRound([Y_AXIS_LEFT_PADDING, width - X_AXIS_RIGHT]).paddingInner(0.1);

				// Width between two ticks is (for instance) pixel-pos
				// at first domain value minus pixel pos at zeroeth domain
				// value:
				bandWidth = xScale(extentDict.x.domain[1]) - xScale(extentDict.x.domain[0]);

				break;
			default:
				throw `Axis type ${ extentDict.x.scaleType } not implemented.}`;
		}
		
		// Y Scale
		switch(extentDict.y.scaleType) {
		case 'linear':
			yScale = d3.scaleLinear()	
			 			 .domain(extentDict.y.domain)
						 .range([height - Y_AXIS_BOTTOM_PADDING, Y_AXIS_TOP_PADDING]);
			break;
		case 'ordinal':
			yScale = d3.scaleOrdinal()
							 .domain(extentDict.y.domain)
							 .range([Y_AXIS_TOP_PADDING, height- Y_AXIS_BOTTOM_PADDING]);
			break;
		default:
			throw `Axis type ${extentDict.x.scaleType} not implemented.}`;
		}
		
		// Make the visual coordinate system:
		
		let xAxisGroup = svg.append("g")		
			 .attr("class", "axis")
			 .attr("id", "xAxisGrp")
			 .attr("transform", `translate(${X_AXIS_LEFT_PADDING}, ${height - X_AXIS_BOTTOM_PADDING})`)
			 .call(d3.axisBottom(xScale));
			 
			 
		// For ordinal X-axes: rotate tick labels by 45%
		// and move them to center between x-axis ticks:
		if (extentDict.x.scaleType === 'ordinal') {
			
			// Find distance between X-ticks;
			let tickWidth  = d3.tickStep(xScale.range()[0], xScale.range()[1], xScale.domain().length);
			let txtSel     = xAxisGroup.selectAll("text");
			
	    	txtSel
		    	.attr("y", -10)
	    		.attr("x", tickWidth / 2)
		    	//.attr("dy", "-0.35em")
		    	.attr("transform", "rotate(45)")
		    	.style("text-anchor", "start")
		}
		
		/* ---------------------------- Y AXIS ---------------------------- */		
		
		let yAxisGroup = svg.append("g")
			 .attr("class", "axis")
			 .attr("id", "yAxisGrp")
			 .attr("transform", `translate(${Y_AXIS_LEFT_PADDING}, ${Y_AXIS_TOP_PADDING})`)	
		     .call(d3.axisLeft(yScale));
		
		
		
		/* -------------------------- Axis Labels (for Axes themselves, not ticks) ----------- */
		
		let xAxisLabel = svg.append("text")
						.attr("class", "x label")
						.attr("id", extentDict.x.axisLabelId)
						.attr("text-anchor", "middle")
						.attr("x", width / 2.0)
						.attr("y", height - X_AXIS_BOTTOM_PADDING - 6)
						.text(extentDict.x.axisLabel)
						
		let yAxisLabel = svg.append("text")
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
	| circleDragged
	-----------------*/
	
	var circleDragged = function(dataCircleSel) {
		/*
		 * Called when a data circle is dragged. Finds the
		 * corresponding correlation circle, and echoes
		 * the move. Two data points correspond to one
		 * correlation point.
		 */
		
		//console.log(`Circle class: ${dataCircleSel.attr('class')}`);
		// Given the data point find the correlation point 
		// that is the same US state; the data point that
		// moved might be a 1996 point or a 2014 pont:
		if (["category1Dot", "category2Dot"].some(function(className) { return dataCircleSel.classed(className) })) {

			let state = dataCircleSel.attr('state'); // US State
			let corrCircleSel     = d3.select(`#${dataCircleSel.attr('state')}`);
			let corrCircleGrp     = corrCircleSel.node().parentNode;
			let corrLabelSel      = d3.select(corrCircleGrp).select('text');

			// Was the 1996 dot of the state moved, 
			// or the 2016 dot?
			// tblRows will have only one val: the 
			// year-row for the data circle. tblRow
			// will be something like the string "[1]":
			// get the '1' from that string:
			let tblRow  	      = JSON.parse(dataCircleSel.attr('tblRows'))[0]; 
			let tblCol  	      = parseInt(dataCircleSel.attr('tblCol'));
			let targetUserVal     = tblObj.getCell(tblRow, tblCol + 1); // tblCol-0 is year col
			let currCx            = parseFloat(corrCircleSel.attr('cx'));
			let currCy            = parseFloat(corrCircleSel.attr('cy'));
			let currLabelX        = parseFloat(corrLabelSel.attr('x'));
			let currLabelY        = parseFloat(corrLabelSel.attr('y'));
			let dx                = 0;
			let dy                = 0;
			if (tblRow == 0) {
				// Was 1996-data point, so corr x-axis is affected:
				dx = scalesCorr.xScale(targetUserVal) - currCx + X_AXIS_LEFT_PADDING;
				let newCircleX = currCx + dx;
				let newLabelX  = currLabelX + dx;
				corrCircleSel.attr('cx', newCircleX);
				corrLabelSel.attr('x', newLabelX)
			} else {
				dy = scalesCorr.yScale(targetUserVal) - currCy + Y_AXIS_TOP_PADDING;
				let newCircleY = currCy + dy;
				let newLabelY  = currLabelY + dy;
				corrCircleSel.attr('cy', newCircleY);
				corrLabelSel.attr('y', newLabelY);
			}
		}
	}
	
	/*---------------------------
	| addCorrTooltip
	-----------------*/
	
	var addCorrTooltip = function(scalesCorr, catStrings) {

		let svgCorrSel  = d3.select(".svgCorr");
		let dotsSel  = d3.selectAll(".corrDot");
		
		svgCorrSel.selectAll("circle")
		  .each(function() {
			
			let dotSel   = d3.select(this);
			let dotState = dotSel.attr('state');
			let dotUserX = (scalesCorr.xScale.invert(dotSel.attr('cx') - X_AXIS_LEFT_PADDING)).toFixed(1);
			let dotUserY = (scalesCorr.yScale.invert(dotSel.attr('cy') - Y_AXIS_TOP_PADDING)).toFixed(1);
			
			// Tooltips; one for each dot. Put
			// into a group for easy moving:
			
			let tooltipGrpSel = svgCorrSel
				.append('g')
				  .attr('id', dotState + 'TooltipGrp')
				  .attr('class', 'corrTooltip');
			
			// Tooltip label rectangles:
			let tooltipRectSel = tooltipGrpSel
			  .append('rect')
			    .attr('x', function() { return dotSel.attr('cx')})
			    .attr('y', function() { return dotSel.attr('cy') })
			    .attr('id', function() {
			    	return dotState + 'TooltipRect';
			    })
			    .attr('class', 'corrTooltipRect');
		      
			let dotToolTxt = `${dotState} ${catStrings.xCat}: ${dotUserX}; ${catStrings.yCat}: ${dotUserY}`; 
			let tooltipTxtSel = tooltipGrpSel
			  .append('text')
			    .text(dotToolTxt)
			    .attr('x', dotSel.attr('cx'))
			    .attr('y', dotSel.attr('cy'))
			    .attr('class', 'corrTooltipTxt')
			    .attr('id', function() {
			    	return dotState + 'corrTooltipTxt';
			    });
		      
			// Adjust tooltip rect width to text width.
			tooltipRectSel
				.attr('width', function() {
					return tooltipTxtSel.node().getBBox().width + 8;
				});
			// Make it easy to get a dot's tooltip group:
			dotSel.attr('tooltipGrpName', tooltipGrpSel.attr('id'));
		  });
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
			d3.select('#corrDiv')
				.attr('class', 'corrDiv');
			break;
		case "step1":
			d3.select('#corrDiv')
				.attr('class', 'corrDiv');
			break;
		case "step2":
			d3.select('#corrDiv')
				.attr('class', 'corrDiv.visible')
				// Need to set background-color when
				// making visible. Doesn't refresh that
				// after making visible:
				.style('background-color', '#F6F6F6')
			break;
		case "reset":
			
			let data = getTrueData().data;
			for ( let rowNum=0; rowNum<data.length; rowNum++) {
				tblObj.setRow(rowNum, data[rowNum]);
			}
			updateDataChart(scalesData);
			// Update correlation:
			placeCorrelationValue();
			updateCorrChart(scalesCorr);
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
var corrViz = CorrelationViz(700, 400);
var bar = 10;

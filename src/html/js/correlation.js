CorrelationViz = function(width, height) {

	// Instance variables:
	
	var width   	     = width;
	var height  	     = height;
	var scalesData	     = null;
	var scalesCorr       = null;
	var tblObj  	     = null;
	var corrTxtEl        = null;
	var dragClickHandler = null;

	// Constants:

	var X_AXIS_LEFT_PADDING      = 0;  // X axis distance left SVG edge
	var X_AXIS_BOTTOM_PADDING    = 50; // X axis distance bottom SVG edge
	var X_AXIS_RIGHT_PADDING     = 50; // X axis distance right SVG edge
	
	var Y_AXIS_BOTTOM_PADDING    = 60; // Y axis distance from SVG bottom
	var Y_AXIS_TOP_PADDING       = 10; // Y axis distance from SVG top
	var Y_AXIS_LEFT_PADDING	     = 60; // Y axis distance from left SVG edge
	
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
        // the maximum dollar amount:
        let nestedData  = tblObj.getData();
        let flatData    = [].concat.apply([], nestedData);
        // Exclude the col-0 names of people:
        let numericData = flatData.filter(function(item) {return typeof(item) === 'number'});
        let yDomain     = [0, Math.max.apply(null, numericData)];
        
        // X axis is months without the col-0 header 'Spender':
        let xDomain     = tblObj.getHeader().slice(1);
        
        // Argument for makeCoordSys:
        let extentDict  = {svg           : svgData, 
        				   x: {scaleType : 'ordinal',
        					   domain    : xDomain,
        					   axisLabel : 'US States'  
            				  },
            			   y: {scaleType : 'linear',
            				      domain : yDomain,
            				   axisLabel : 'Murders per 100K People'
            			      }
                          };

		this.scalesData = makeCoordSys(extentDict);
		
		// Build the correlations chart:
		
		// The "+40" is a kludge! It makes the 
		// svg height of the correlation chart
		// match the kludge needed for the data svg
		// height:
		d3.select('#corrDiv')
			.style("height", height + 40)
		
		
		svgCorr = d3.select("#corrDiv").append("svg")
		.attr("width", "100%")
		.attr("height", "100%")
		.attr("viewBox", `0 0 ${width} ${height}`)
		.attr("id", "corrChart")
		.attr("class", "svgCorr")
		
		// The categories of dots ("1996", "2014")
		let dataCat1 = tblObj.getCell(0, 0);
		let dataCat2 = tblObj.getCell(1, 0);
		
        extentDict  = {svg           : svgCorr,
        			   x: {scaleType : 'linear',
        				   domain    : yDomain,
        				   axisLabel : 'Murder rate per 100K in ' + dataCat1   
            			  },
            		   y: {scaleType : 'linear',
            		       domain    : yDomain,
        				   axisLabel : 'Murder rate per 100K in ' + dataCat2               		      
            		      }
                       };

		scalesCorr = makeCoordSys(extentDict);
		// Initialize the data chart, which 
		// will initialize the correlation chart
		// as well:
		updateDataChart(this.scalesData);
		placeCorrelationValue();
		// Make correlation dots match:
		updateCorrChart(scalesCorr);
		// Create labels and tooltips. Pass the
		// x/y scales and the 1996/2014 category strings:
		addCorrTooltip(scalesCorr, {xCat : dataCat1, yCat : dataCat2});
		
		return {width  : width,
				height : height,
				tblObj : tblObj,
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
		
		let headerRow = ['State', 'Alabama', 'California', 'Georgia',  'Mississippi', 'Nevada']
		let data      = [['1996', 10.4, 9.1, 9.5, 11.1, 13.7],
		                 ['2014', 5.7, 4.4, 5.7, 8.6, 6.0]
		                 ]
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
		  .data(function() { return tblObj.getData(NO_HEADER_ROW, NO_COL0) }) // matrix

		// For each row of the matrix: create or update 
		// dots, giving the dots of each row a different
		// CSS class. This loop should be doable as pure D3,
		// but I couldn't get the 'outer' loop (i.e. outer selection)
		// to run through all rows:
		for (let row of tblObj.getData(NO_HEADER_ROW, NO_COL0)) {
			
			dotClass = dotClasses[++currRowNum];
			let colNum = 0;

			personDotSel = svgData.selectAll('.' + dotClass)
				.data(function() { return row })
				
			personDotSel
				// Update existing dots with (possibly) changed data:
				.attr('cx', function(d,colNum)  { return xScale(states[colNum]) + Math.round(bandWidth / 2.0) })
				.attr('cy', function(d, colNum) { return yScale(d) + Y_AXIS_TOP_PADDING }) // one row element at a time
				
			personDotSel.enter() 
				// Add additional dots if now more data than before:
				.append('circle')
				.attr('state',  function(row, i) { return states[i] })
				.attr('id', function(row, i) { return states[i] + tblObj.getCell(currRowNum, 0) }) // Category
				.attr('tblRows', function() { return `[${currRowNum}]` })   // Only one table row is involved ********???
				.attr('tblCol', function() { return colNum++ } )
				.attr('r', DOT_RADIUS)                                                     // to which this circle belongs.
				.attr('cx', function(d,colNum)  { return xScale(states[colNum]) + Math.round(bandWidth / 2.0) })
				.attr('cy', function(d, colNum) { return yScale(d) + Y_AXIS_TOP_PADDING }) // one row element at a time
				.attr('class', function() { return dotClass } )

				// Attach drag-start behavior to this circle.
				// Do update the data table from these moves.
				.call(addDragBehavior(dotClasses, yScale, xScale, {vertical: true, horizontal: false}, UPDATE_TABLE));
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
		// 'Spender', 'Monica', 'Daniel' column:
		
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

		ROW_1996 = 0;
		ROW_2014 = 1;
		
		svgCorr.selectAll('.corrDot')
		  .data(function() { return byYear })
		  
    	  // Update (possibly existing dots):
		    .attr('cx', function(byYearPair, stateIndex) { return xScale(byYearPair.yearXAxis) } )
		    .attr('cy', function(byYearPair, stateIndex) { return yScale(byYearPair.yearYAxis) } )
			
		  .enter()
		    .append('circle')
		    .attr('state', function(byYearPair, stateIndex) { return states[stateIndex] })
		    .attr('id', function(byYearPair, stateIndex) { return states[stateIndex] })		    
		    .attr('tblRows', function(byYearPair, i) { return `[${ROW_1996}, ${ROW_2014}]` })
		    .attr('tblCol', function(byYearPair, i) { return i } )
			.attr('cx', function(byYearPair, stateIndex) { return xScale(byYearPair.yearXAxis) } )
			.attr('cy', function(byYearPair, stateIndex) { return yScale(byYearPair.yearYAxis) } )
			.attr('r', DOT_RADIUS)
			.attr('class', 'corrDot')
			
			// Attach drag-start behavior to this circle.
			// Don't update the data table from these moves
			// of correlation dots, b/c it's ambiguous which 
			// row should be updated (each dot includes information
			// from rows):
			.call(addDragBehavior(dotClasses, yScale, xScale, {vertical: true, horizontal: true}, DONT_UPDATE_TABLE))
		
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
										

		return d3.behavior.drag()
				.on('dragstart', function(d) {
					
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
					d3.behavior.drag.currCircle = this;
					
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
						circleSel = d3.select(d3.behavior.drag.currCircle);
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
							circleSel = d3.select(d3.behavior.drag.currCircle);
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
					// Let interested parties know that a circle moved:
					dispatch.drag(this, circleSel);
				})
				.on ('dragend', function(d) {
					d3.select(this).classed("dragging", false);
					d3.behavior.drag.currCircle = undefined;
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
	}
	
	/*---------------------------
	| handleDrag
	-----------------*/
	
	var handleDrag = function(d3CircleSel, yScale, xScale, dragDirections, updateTable) {
		/*
		 Find this dot's corresponding table cell
		 Find new y-position in table coordinates.
		 update the table.
		 
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
		
		switch(extentDict.x.scaleType) {
		case 'linear':
			xScale = d3.scale.linear()
							 .domain(extentDict.x.domain)
							 .range([Y_AXIS_LEFT_PADDING, width - X_AXIS_RIGHT_PADDING]);
			break;
		case 'ordinal':
			xScale = d3.scale.ordinal()
							 .domain(extentDict.x.domain)
							 .rangeRoundPoints([Y_AXIS_LEFT_PADDING, width - X_AXIS_RIGHT_PADDING], 1.5);
							 
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
		
		     
		// For ordinal X-axes: rotate labels by 45%
		// and move them to center between x-axis ticks:
		if (extentDict.x.scaleType == 'ordinal') {
			
			// Find distance between X-ticks;
			// xScale.range() returns array with
			// pixel coords of each tick:
			let tickArr    = xScale.range();
			let tickWidth  = tickArr[1] - tickArr[0];
			let txtSel     = xAxisGroup.selectAll("text");
			
	    	txtSel
		    	.attr("y", -10)
	    		.attr("x", tickWidth / 2)
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
		
		
		/* -------------------------- Axis Labels (for Axes themselves, not ticks) ----------- */
		
		xAxisLabel = svg.append("text")
						.attr("class", "x label")
						.attr("text-anchor", "middle")
						.attr("x", width / 2.0)
						.attr("y", height - X_AXIS_BOTTOM_PADDING - 6)
						.text(extentDict.x.axisLabel)
						
		yAxisLabel = svg.append("text")
						.attr("class", "y label")
						.attr("text-anchor", "end") // I'm still confused about x/y of rotated text:
						.attr("x", - (height / 4.))  // The "/3." is empirical...
						.attr("y", Y_AXIS_LEFT_PADDING / 2)
						.attr("transform", "rotate(-90)")
						.text(extentDict.y.axisLabel)
						
		return {xScale    : xScale,
				yScale    : yScale,
				bandWidth : bandWidth,
			   }
	}

	/*---------------------------
	| circleDragged
	-----------------*/
	
	var circleDragged = function(circleObj, circleSel) {
		//console.log(`Circle class: ${circleSel.attr('class')}`);
		if (["category1Dot", "category2Dot"].some(function(className) { return circleSel.classed(className) })) {

			let state = circleSel.attr('state'); // US State
			corrCircleSel = d3.select(`#${circleSel.attr('state')}`);
			
			updateCorrChart(scalesCorr);
		}
	}
	
	/*---------------------------
	| addCorrTooltip
	-----------------*/
	
	var addCorrTooltip = function(scalesCorr, catStrings) {

		let svgCorr = d3.select(".svgCorr");
		let dotsSel = d3.selectAll(".corrDot");
		// Removal returns array of array of all removed
		// elements. The [0] makes this [<circle>,<circle>,...]
		let removedDots = d3.selectAll('.corrDot').remove()[0];
		
		for (let removedDot of removedDots) {
			
			let dotUserX = scalesCorr.xScale.invert(d3.select(removedDot).attr('cx')).toFixed(1);
			let dotUserY = scalesCorr.yScale.invert(d3.select(removedDot).attr('cy')).toFixed(1);
			
			let dotLabelAndTxtGrpSel = svgCorr
  			  .append("g")
			    .attr('id', function() {
				               d3.select(this).append(function() { return removedDot });
				               return removedDot.id + 'Group';
			    });

			// Permanent label rectangles:
			let rectSel = dotLabelAndTxtGrpSel
			  .append('rect')
			    .attr('x', function() { return d3.select(removedDot).attr('cx')})
			    .attr('y', function() { return d3.select(removedDot).attr('cy') })
			    .attr('class', 'corrStateLabelRect');

			let txtSel = dotLabelAndTxtGrpSel
			  .append('text')
			    .text(STATE_TBL[d3.select(removedDot).attr('state')])
			    .attr('x', rectSel.attr('x'))
			    .attr('y', rectSel.attr('y'))
			    .attr('class', 'corrStateLabelTxt')

			    
			// Tooltip label rectangles:
			let tooltipRectSel = dotLabelAndTxtGrpSel
			  .append('rect')
			    .attr('x', function() { return d3.select(removedDot).attr('cx')})
			    .attr('y', function() { return d3.select(removedDot).attr('cy') })
			    .attr('id', function() {
			    	return d3.select(removedDot).attr('state') + 'TooltipRect';
			    })
			    .attr('class', 'corrTooltipRect');
			    
			let dotToolTxt = `${d3.select(removedDot).attr('state')} ${catStrings.xCat}: ${dotUserX}; ${catStrings.yCat}: ${dotUserY}`; 
			
			let tooltipTxtSel = dotLabelAndTxtGrpSel
			  .append('text')
			    .text(dotToolTxt)
			    .attr('x', rectSel.attr('x'))
			    .attr('y', rectSel.attr('y'))
			    .attr('class', 'corrTooltipTxt')
			    .attr('id', function() {
			    	return d3.select(removedDot).attr('state') + 'TooltipTxt';
			    });
			    
			// Adjust tooltip rect width to text width.
			// For now, just move them all to the top of the
			// screen so we don't neet to deal with overlap and 
			// extension beyond the window:
			tooltipRectSel
				.attr('width', function() {
					return tooltipTxtSel.node().getBBox().width + 6;
				})
				.attr('x', function() { return svgCorr.attr('width') / 2.0 - this.width / 2.0} )
				.attr('y', 50);
		}		
	
		// Permanent label texts:
		d3.selectAll(".corrDot")
			.on("mouseover", function() {
				d3.select('#undefinedToolTip')
					.classed("visible", true)
			})
/*			.on("mousemove", function(circle) {
				tooltip
					.text(d3.event.pageX + ", " + d3.event.pageY)
					//****.style("left", `${circle.cx - 34}px`)
					//****.style("top",  `${circle.cy - 12}px`)
					.style("left", (d3.event.pageX - 34) + "px")
					.style("top", (d3.event.pageY - 12) + "px");
			})
*/			.on("mouseout", function() {
				d3.select(this).select('.corrTooltip')
				   .classed("visible", false)
			})
			
	}
	
	
	return constructor(width, height);
}
var corrViz = CorrelationViz(700, 400);
var bar = 10;
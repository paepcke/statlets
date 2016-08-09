CorrelationViz = function(width, height) {

	// Instance variables:
	
	var width  = width;
	var height = height;
	var svg    = null;	
	var xScale = null;
	var yScale = null;	
	var xAxis  = null;
	var yAxis  = null;
	var tblObj = null;
	var corrTxtEl = null;
	var dragClickHandler = null;
	var bandWidth = null; // width in pixels between two x-axis ticks.
	

	
	// Constants:

	var X_AXIS_LEFT_PADDING      = 0; // X axis distance left SVG edge
	var X_AXIS_BOTTOM_PADDING    = 50; // X axis distance bottom SVG edge
	var X_AXIS_RIGHT_PADDING     = 50; // X axis distance right SVG edge
	
	var Y_AXIS_BOTTOM_PADDING    = 60; // Y axis distance from SVG bottom
	var Y_AXIS_TOP_PADDING       = 10; // Y axis distance from SVG top
	var Y_AXIS_LEFT_PADDING	     = 60; // Y axis distance from left SVG edge
	
	var CORR_TXT_POS             = {x : Y_AXIS_LEFT_PADDING + 30,
									y : Y_AXIS_TOP_PADDING  + 30
									};
	
	var DOT_RADIUS               = 10;  // pixels.

	
	/*---------------------------
	| contructor 
	-----------------*/
	
	var constructor = function() {
		
		// Find the div in which the chart is to reside,
		// and its dimensions:

		let chartDiv = document.getElementById('chartDiv');
			
		width  = chartDiv.clientWidth;
		height = chartDiv.clientHeight;

		// The "+40" is a kludge! It accounts
		// for the additional space that the x-axis
		// labels will take once they are rotated
		// 45 degrees: 
		d3.select('#chartDiv')
			.style("height", height + 40)
		
		svg = d3.select("#chartDiv").append("svg")
		.attr("width", "100%")
		.attr("height", "100%")
		.attr("viewBox", `0 0 ${width} ${height}`)
		.attr("id", "chart")
		.attr("class", "chartSVG")

		dragClickHandler = StatsDragClickHandler(svg);
		// Only allow dragging dots vertically:
		dragClickHandler.setAllowDrag({horizontal : false,
									   vertical   : true})
		// Don't allow creation of new dots by clicking:
		dragClickHandler.setAllowDotCreation(false);


		// Add a background
// **************		
/*		svg.append("rect")
			.attr("width", "100%")
			.attr("height", "100%")
			.attr("class", "chartSVG")
			.attr("id", "svgBackground")
*/				
// **************				
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
        let extentDict  = {x: {scaleType : 'ordinal',
        					   domain    : xDomain,
        					   axisLabel : 'US States'  
            				  },
            			   y: {scaleType : 'linear',
            				      domain : yDomain,
            				   axisLabel : 'Murders per 100K People'
            			      }
                          };

		makeCoordSys(extentDict);
		updateChart();
		placeCorrelationValue();
        
		return {width  : width,
				height : height,
				tblObj : tblObj,
				updateChart, updateChart,
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
	| updateChart 
	-----------------*/
	
	var updateChart = function() {
		
		// Get header (months), and data without the
		// 'Spender', 'Monica', 'Daniel' column:
		
		let months      = tblObj.getHeader().slice(1);
		
		let dotClasses  = ['person1Dot', 'person2Dot'];
		
		let NO_HEADER_ROW = false;
		let NO_COL0       = false;

		let currRowNum = -1;
		
		let addDragBehavior = d3.behavior.drag()
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
					
					let mouseY  = d3.event.y;
					let circleY = circleSel.attr('cy');
					let circleR = circleSel.attr('r');
					
					if (Math.abs(mouseY - circleY) > circleR) {
						// Mouse got ahead of the dragged circle.
						// Select the circle we are dragging instead:
						circleSel = d3.select(d3.behavior.drag.currCircle);
					}
					
					if (! circleSel.classed("dragging")) {
						// Not over something being dragged:
						return;
					}
					
					handleDrag(circleSel);
				})
				.on ('dragend', function(d) {
					d3.select(this).classed("dragging", false);
					d3.behavior.drag.currCircle = undefined;
				})
				
		svgSel = d3.select('svg')
		  .data(function() { return tblObj.getData(NO_HEADER_ROW, NO_COL0) }) // matrix

		// For each row of the matrix: create or update 
		// dots, giving the dots of each row a different
		// CSS class. This loop should be doable as pure D3,
		// but I couldn't get the 'outer' loop (i.e. outer selection)
		// to run through all rows:
		for (let row of tblObj.getData(NO_HEADER_ROW, NO_COL0)) {
			
			dotClass = dotClasses[++currRowNum];
			let colNum = 0;

			personDotSel = svgSel.selectAll('.' + dotClass)
				.data(function() { return row })
				
			personDotSel
				// Update existing dots with (possibly) changed data:
				.attr('cx', function(d,colNum)  { return xScale(months[colNum]) + Math.round(bandWidth / 2.0) })
				.attr('cy', function(d, colNum) { return yScale(d) + Y_AXIS_TOP_PADDING }) // one row element at a time
				
			personDotSel.enter() 
				// Add additional dots if now more data than before:
				.append('circle')
				.attr('tblRow', function() { return currRowNum })
				.attr('tblCol', function() { return colNum++ } )
				.attr('r', DOT_RADIUS)                                                     // to which this circle belongs.
				.attr('cx', function(d,colNum)  { return xScale(months[colNum]) + Math.round(bandWidth / 2.0) })
				.attr('cy', function(d, colNum) { return yScale(d) + Y_AXIS_TOP_PADDING }) // one row element at a time
				.attr('class', function() { return dotClass } )

				// Attach drag-start behavior to this circle.
				.call(addDragBehavior)
		}
		
		// If it does not yet exist, create a legend,
		// else done:
		
		if (! d3.selectAll('.legend').empty()) {
			return;
		}
		
		// Add a legend:
		
		let categoryColorObjs = [];
		let dataSeriesCategoryIndx = 0; 
		for (let dotClass of dotClasses) {
			let rgb = d3.selectAll('.' + dotClass).style('fill');
			let dataCat = tblObj.getCell(dataSeriesCategoryIndx++, 0);
			categoryColorObjs.push({category : dataCat, rgb : rgb});
		}

		//****let LEGEND_X_PADDING = 40; // px from left
		let LEGEND_X_PADDING = Y_AXIS_LEFT_PADDING / 3.; // px from left
		let LEGEND_Y_PADDING = height - 20; // px from top
		let LEGEND_RECT_SIZE = 12; // sides of legend rects
		let LEGEND_SPACING = 4;    // vertical space betw. legend rows.
		let LEGEND_TXT_RECT_GAP = 3 // gap between legend text and its rectangle swatch
		
		// Create as many groups as there are categories (colors) of data:
		let legendSel = svgSel.selectAll('.legend')
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
		  		//****return `translate(${LEGEND_X_PADDING + txtRect.width - LEGEND_TXT_RECT_GAP}, ${yOffset})`;
		  		return `translate(${txtRect.width + LEGEND_TXT_RECT_GAP}, ${yOffset})`;
		  	})
		  	.attr('fill', function(catColorObj, i) {
		  		return catColorObj.rgb;
		  	})
	};
	
	/*---------------------------
	| handleDrag
	-----------------*/
	
	var handleDrag = function(d3CircleSel) {
		/*
		 Find this dot's corresponding table cell
		 Find new y-position in table coordinates.
		 update the table.
		 */
		
		let tblRow = parseInt(d3CircleSel.attr('tblRow'));
		// The +1: skip col0, which is the spender's name:
		let tblCol = parseInt(d3CircleSel.attr('tblCol')) + 1;

		//******let userFrmY  = yScale.invert(d3CircleSel.attr('cy') - Y_AXIS_TOP_PADDING);
		let userFrmY  = yScale.invert(d3.event.y - Y_AXIS_TOP_PADDING);

		tblObj.setCell(tblRow, tblCol, userFrmY.toFixed(2));
		// Update correlation:
		placeCorrelationValue();
		
		dragClickHandler.dragmove(d3CircleSel);
	}
	
/*	---------------------------
	| populateChart 
	-----------------
	
	var populateChart = function() {
		
		// Get header (months), and data without the
		// 'Spender', 'Monica', 'Daniel' column:
		
		var person1Data = tblObj.getRow(0).slice(1);
		var person2Data = tblObj.getRow(1).slice(1);
		let months      = tblObj.getHeader().slice(1);
		
		
		for (let dataIndx=0; 
		         dataIndx<Math.min(person1Data.length, person2Data.length);
		         dataIndx++) {
			let month    = months[dataIndx];
			let pers1Val = person1Data[dataIndx];
			let pers2Val = person2Data[dataIndx];
			let x        = xScale(month);
			let yPers1   = yScale(pers1Val);
			let yPers2   = yScale(pers2Val);
			
			dragClickHandler.createDot(x,yPers1, 'person1Dot', bandWidth);
			dragClickHandler.createDot(x,yPers2, 'person2Dot', bandWidth);
		}
	}
*/	
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
			corrTxtEl = svg.append("text")
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
		 */
		
		/* ---------------------------- X AXIS ---------------------------- */		

		// X Scale:
		
		switch(extentDict.x.scaleType) {
		case 'linear':
			xScale = d3.scale.linear()
							 .domain(extentDict.x.domain)
							 .rangeRoundBands([0, width - X_AXIS_RIGHT_PADDING]);
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
	    	
/*	    	let svgDiv     = document.getElementById('chartDiv');
	    	let svgHeight  = svgDiv.getBoundingClientRect().height;
	    	d3.select("#chartDiv")
	    	   .style("height", svgHeight + 50)
*/	    	
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
	}

	return constructor(width, height);
}
var corrViz = CorrelationViz(700, 400);
var bar = 10;
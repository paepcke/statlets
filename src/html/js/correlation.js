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
	var Y_AXIS_LEFT_PADDING	     = 40; // Y axis distance from left SVG edge
	
	var CORR_TXT_POS             = {x : Y_AXIS_LEFT_PADDING + 30,
									y : Y_AXIS_TOP_PADDING  + 30
									};
	
	var DOT_RADIUS               = 10;  // pixels.

	
	/*---------------------------
	| contructor 
	-----------------*/
	
	var constructor = function() {
		
		let chartDiv = document.getElementById('chartDiv');
		
		chartDiv.style.width  = `${width}px`;
		chartDiv.style.height = `${height}px`;

		svg = d3.select("#chartDiv").append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("id", "chart")
		.attr("class", "chartSVG")

		dragClickHandler = StatsDragClickHandler(svg);
		// Only allow dragging dots vertically:
		dragClickHandler.setAllowDrag({horizontal : false,
									   vertical   : true})
		// Don't allow creation of new dots by clicking:
		dragClickHandler.setAllowDotCreation(false);


		// Add a background
		svg.append("rect")
		.attr("width", width)
		.attr("height", height)
		.attr("class", "chartSVG")
		.style("fill", "#F6F6F6")
				
        tblObj = createTable();
        tblObj.classed({table: 'inputTable'});
        document.getElementById('tableDiv').appendChild(tblObj.value());
        
        // From the (y-) data of the table, get 
        // the maximum dollar amount:
        let nestedData  = tblObj.getData();
        let flatData    = [].concat.apply([], nestedData);
        // Exclude the col-0 names of people:
        let numericData = flatData.filter(function(item) {return typeof(item) === 'number'});
        let yDomain     = [0, Math.max(numericData)];
        
        // X axis is months without the col-0 header 'Spender':
        let xDomain     = tblObj.getHeader().slice(1);
        
        // Argument for makeCoordSys:
        let extentDict  = {x: {scaleType : 'ordinal',
        					      domain : xDomain
            				  },
            			   y: {scaleType : 'linear',
            				      domain : yDomain
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
		let headerRow = ['Spender', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 
		                 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
		//let data      = [['Monica', 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
		//                 ['Daniel', 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125]
		//				]
		let data      = [['Monica'],
		                 ['Daniel']
		                 ]
		for (let i=0; i<12; i++) {
			data[0].push(Math.round(100*Math.random()));
			data[1].push(Math.round(100*Math.random()));
		}
		
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
		
		svgSel = d3.select('svg')
		  .data(function() { return tblObj.getData(NO_HEADER_ROW, NO_COL0) }) // matrix

		for (let row of tblObj.getData(NO_HEADER_ROW, NO_COL0)) {
			
			dotClass = dotClasses[++currRowNum];

			personDotSel = svgSel.selectAll('.' + dotClass)
				.data(function() { return row })
				
			personDotSel
				// Update existing dots with (possibly) changed data:
				.attr('cx', function(d,colNum)  { return xScale(months[colNum]) + Math.round(bandWidth / 2.0) })
				.attr('cy', function(d, colNum) { return yScale(d) + Y_AXIS_TOP_PADDING }) // one row element at a time
				
			personDotSel.enter() 
				// Add additional dots if now more data than before:
				.append('circle')
				.attr('r', DOT_RADIUS)
				.attr('cx', function(d,colNum)  { return xScale(months[colNum]) + Math.round(bandWidth / 2.0) })
				.attr('cy', function(d, colNum) { return yScale(d) + Y_AXIS_TOP_PADDING }) // one row element at a time
				.attr('class', function() { return dotClass } )

				.call(dragClickHandler.drag);
		}
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
		 *                    },
		 *                y : {scaleType : <linear | ordinal | time> },
		 *                         domain: <[min,max]>                   // if linear scale
		 *                         domain: <[ord1,ord2,...]>             // if ordinal scale
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
							 .range([Y_AXIS_TOP_PADDING, height - Y_AXIS_BOTTOM_PADDING]);
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
		if (extentDict.x.scaleType == 'ordinal') {
		xAxisGroup.selectAll("text")
		     .attr("y", 0)
		     .attr("x", 30)
		     .attr("dy", ".30em")
		     .attr("transform", "rotate(45)")
		     .style("text-anchor", "start")
		}
		
		/* ---------------------------- Y AXIS ---------------------------- */		
		yScale = d3.scale.linear()
			 			 .domain([0,150]) // expenditures between $0 and $150 **** get from table data
						 .range([height - Y_AXIS_BOTTOM_PADDING, Y_AXIS_TOP_PADDING]);
		
		yAxis = d3.svg.axis()
				      .scale(yScale)
				      .orient("left");
		
		// Create a group, and call the xAxis function to create the axis:
		svg.append("g")
			 .attr("class", "axis")
			 //.attr("transform", "translate("[Y_AXIS_LEFT_PADDING + (height - Y_AXIS_TOP_PADDING) + ")")	
			 .attr("transform", `translate(${Y_AXIS_LEFT_PADDING}, ${Y_AXIS_TOP_PADDING})`)	
		     .call(yAxis);
		
		
		
	}

	return constructor(width, height);
}
var corrViz = CorrelationViz(700, 400);
var bar = 10;
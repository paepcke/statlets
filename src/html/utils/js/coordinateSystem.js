import * as d3 from "./d3.min";

var CoordinateSystem = function(coordInfo) {
	/*
	 * Draw a coordinate system in a given SVG.
	 * All parameters are passed in one object.
	 * 
	 * Required properties are:
	 * 
	 *      o d3 selection of the SVG element to draw in,
	 *      o the scale type for both axes, and 
	 *      o the domain for both axes.
	 * 
	 * Optionally the parameter objects may also 
	 * hold these properties:
	 * 
	 * 		o height        ; height of coordinate system in pixels. Default: fill parent
	 * 		o width         ; width of coordinate system in pixels. Default: fill parent	 * 
     * 
	 * For each of the axes:
	 * 
	 * 		o axisLabel
	 * 		o subclass      ; any css class to add to the axis' group.
	 * 		o leftPadding
	 *
     * For the X axis:
	 * 
	 * 		o rightPadding
	 * 		o bottomPadding
	 *
	 * For the X axis:
	 * 
	 * 		o topPadding
	 *  
	 * 
	 * :param coordInfo:
	 *  	           {
	 *  	               x : {scaleType    : <"linear" | "ordinal" | "time"> },
	 *  	                       domain    : [0, 50],                     // if linear scale
	 *  	                       domain    : ["small","medium","large"],  // if ordinal scale
	 *                            axisLabel  : "My x axis scale"
	 *  	                       subclass  : "pantsStyling",
	 *  						 rightPadding: <padding-right px>,
	 *  	                   },
	 *  	               y : {scaleType    : <"linear" | "ordinal" | "time"> },
	 *  	                       domain    : <[min,max]>,                  // if linear scale
	 *  	                       domain    : <[ord1,ord2,...]>,            // if ordinal scale
	 *  						   topPadding: 10
	 *  	            }
	 *      Notes:
	 *          o <axis description> is the label for an axis is a
	 *            whole, i.e. not the tick labels.
	 *          o <additionalClass>, if present, will be used to
	 *            class the axis *in addition to* class "axis".
	 *            Example: <additionalClass> == 'noTicks' will 
	 *                     cause the axis to be of CSS class axis.noTicks.
	 *                     
	 * Returns an object with four properties: xScale, yScale,
	 * bandWidth (width in pixels between two x-axis ticks), and a 
	 * d3 selection of the coordinate system as a whole. 
	 * 
	 */
	
	let svgSel 	  = coordInfo.svgSel;
	
	let height       = null;
	let width        = null;
	   
	let yAxis        = null;
	let xScale       = null;
	let yScale       = null;
	let xDomain      = null;
	let yDomain      = null;
	
	let xScaleType   = null;
	let yScaleType   = null;
	
	let xSubclass    = null;
	let ySubclass    = null;
	
	let xBandWidth   = null; // width in pixels between two x-axis ticks.
	let yBandWidth   = null; // width in pixels between two y-axis ticks.
	
	let origMaxY     = null;
	let origMaxX     = null;
	
	let coordSysSel  = null;
	
	let xAxisLabelId = null;
	let xAxisGrpName = null;
	
	let yAxisLabelId = null;
	let yAxisGrpName = null;
	
	let xAxisGroup   = null;
	let yAxisGroup   = null;
	
	let X_AXIS_LEFT       = 0;
	let X_AXIS_RIGHT      = 30;
	let X_AXIS_BOTTOM     = 20;

	let Y_AXIS_LEFT       = 50;
	let Y_AXIS_TOP        = 10;
	
	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function(coordInfo) {
		
		xAxisLabelId = "xAxisLbl_" + uniqueNum();
		xAxisGrpName = "xAxisGrpNm" + uniqueNum();

		yAxisLabelId = "yAxisLbl_" + uniqueNum(); 
		yAxisGrpName = "yAxisGrpNm" + uniqueNum();
		
		
		/* ------------ Required args ------------- */
		
		/* SVG to draw in */
		if ( typeof(coordInfo.svgSel) !== "undefined" ) {
			svgSel = coordInfo.svgSel;
		} else {
			throw("Must pass the d3 selection of the SVG element for the coordinate system")
		}
		
		if ( typeof(coordInfo.x.scaleType) !== 'undefined') {
			xScaleType = coordInfo.x.scaleType;
		} else {
			throw 'Must provide x-scale type when creating coordinate system.';
		}
		
		if ( typeof(coordInfo.y.scaleType) !== 'undefined') {
			yScaleType = coordInfo.y.scaleType;
		} else {
			throw 'Must provide y-scale type when creating coordinate system.';
		}
		
		if ( typeof(coordInfo.x.domain) !== 'undefined') {
			xDomain  = coordInfo.x.domain;
			origMaxX = xDomain[1]; 
		} else {
			throw 'Must provide x-axis domain when creating coordinate system.';
		}

		if ( typeof(coordInfo.y.domain) !== 'undefined') {
			yDomain  = coordInfo.y.domain;
			origMaxY = yDomain[1]; 
		} else {
			throw 'Must provide y-axis domain when creating coordinate system.';
		}
		
		/* ------------ Optional args ------------- */
		/* Height of entire coordinate system; default: fill 
		 * the given SVG's parent: */
		if (typeof(coordInfo.height) !== 'undefined') {
			height = coordInfo.height; 
		} else {
			height = svgSel.node().parentElement.clientHeight
		}
		
		/* Width of entire coordinate system; default: fill 
		 * the given SVG's parent: */
		if (typeof(coordInfo.width) !== 'undefined') {
			width = coordInfo.width; 
		} else {
			width = svgSel.node().parentElement.clientWidth;
		}
		
		if (typeof(coordInfo.x.subclass) !== 'undefined') {
			xSubclass = coordInfo.x.subclass;
		}
		
		if (typeof(coordInfo.y.subclass) !== 'undefined') {
			ySubclass = coordInfo.y.subclass;
		}
		
		/* X-Axis placement: */
		if (typeof(coordInfo.x.rightPadding) !== 'undefined') {
			X_AXIS_RIGHT = coordInfo.x.rightPadding; 
		}
		if (typeof(coordInfo.x.bottomPadding) !== 'undefined') {
			X_AXIS_BOTTOM = coordInfo.x.bottomPadding; 
		}
		
		/* Y-Axis placement: */
		if (typeof(coordInfo.y.leftPadding) !== 'undefined') {
			Y_AXIS_LEFT= coordInfo.y.leftPadding; 
		}
		if (typeof(coordInfo.y.topPadding) !== 'undefined') {
			Y_AXIS_TOP = coordInfo.y.topPadding; 
		}
		
		// Make the SVG match width/height:
		svgSel.attr("width", width);
		svgSel.attr("height", height);
		
		makeCoordSys();
		
		return {
			rescaleY		: rescaleY,
			resetY          : resetY,
			xLabelsShow     : xLabelsShow,
			yLabelsShow     : yLabelsShow,
			svgSel          : svgSel,
			xScale          : xScale,
			yScale          : yScale,
			xDomain         : xDomain,
			yDomain         : yDomain,
			xBandWidth      : xBandWidth,
			yBandWidth      : yBandWidth,
			coordSysSel     : coordSysSel,
			height          : height,
			width           : width,
			xAxisRightPad   : X_AXIS_RIGHT,
			xAxisBottomPad  : X_AXIS_BOTTOM, 
			yAxisLeftPad    : Y_AXIS_LEFT,
			yAxisTopPad     : Y_AXIS_TOP,
		}
	}
	
	
	/*---------------------------
	| rescaleY 
	-----------------*/
	
	var rescaleY = function(valsToInclude) {
		/*
		 * Given an array of y-values, find the largest,
		 * and ensure that the y-axis includes that largest
		 * number. If the largest number is larger than the
		 * current top of the vertical scale, than that scale's
		 * top will be increased. If the max in valsToInclude
		 * is less than the current top of the y-axis, then
		 * the scale will be shortened.
		 */

		let scaleHighVal = yDomain[1]; // the high number
		let maxValToInclude = Math.max.apply(null, valsToInclude);

		// Find a scale that includes maxValToAdjustTo:
		if ( maxValToInclude > scaleHighVal ) {
			while ( maxValToInclude > scaleHighVal ) {
				scaleHighVal = 2*scaleHighVal;
			}
		} else {
			while ( maxValToInclude < scaleHighVal ) {
				scaleHighVal = Math.round(scaleHighVal / 2);
			}
		}
		// Change the vertical scale up or down:
		yScale.domain([0, scaleHighVal]);
		yAxisGroup
			.transition().duration(1500).ease(d3.easePolyInOut)  // https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
		    .call(d3.axisLeft(yScale)
		    		.tickFormat(d3.format("d")));
	}
	
	/*---------------------------
	| resetY 
	-----------------*/
	
	var resetY = function() {
		/*
		 * Re-scales y axis to its original highest value.
		 */
		rescaleY([origMaxY]);
	}
	
	/*---------------------------
	| xLabelsShow
	-----------------*/
	
	var xLabelsShow = function(doShow) {
		if(doShow) {
			xAxisLabel.style("display", "block");
		} else {
			xAxisLabel.style("display", "none");
		}
	}

	/*---------------------------
	| yLabelsShow
	-----------------*/
	
	var yLabelsShow = function(doShow) {
		if(doShow) {
			yAxisLabel.style("display", "block");
		} else {
			yAxisLabel.style("display", "none");
		}
	}
	
	
	/*---------------------------
	| makeCoordSys 
	-----------------*/
	
	var makeCoordSys = function() {
		
		
		makeScales();
		makeAxes();
		makeAxesCaptions();
		
		// Move x-tick labels down a bit:
		xAxisGroup.selectAll("text").attr("dy", "1.71em");
		
		// Prevent the labels from lighting up when
		// cursor runs over them:
						
		makeUnselectable(d3.selectAll('.axis text'));
		makeUnselectable(d3.selectAll('.x.label'));
		makeUnselectable(d3.selectAll('.y.label'));
		
		// Select the whole coordinate system in
		// case client wants to translate or hide it:
		let allNodes = xAxisGroup.nodes().concat(yAxisGroup.nodes())
						 .concat(d3.select("#" + xAxisLabelId).nodes())
						 .concat(d3.select("#" + yAxisLabelId).nodes())
						
		coordSysSel = d3.selectAll(allNodes);
	}
	
	/*---------------------------
	| makeScales 
	-----------------*/
	
	var makeScales = function() {
		
		// X Scale:
		
		switch(xScaleType) {
		case 'linear':
			xScale = d3.scaleLinear()
							 .domain(xDomain)
							 .range([Y_AXIS_LEFT, width - X_AXIS_RIGHT]);
			break;
		case 'ordinal':
			xScale = d3.scaleBand()
							 .domain(xDomain)
							 .rangeRound([Y_AXIS_LEFT, width - X_AXIS_RIGHT])
							 .paddingInner(0.1);
							 
			// Width between two ticks is (for instance) pixel-pos
			// at first domain value minus pixel pos at zeroeth domain
			// value:
			xBandWidth = xScale(xDomain[1]) - xScale(xDomain[0]) 

		break;
		default:
			throw `Axis type ${xScaleType} not implemented.`;
		}
		

		// Y Scale
		switch(yScaleType) {
		case 'linear':
			yScale = d3.scaleLinear()	
			 			 .domain(yDomain)
						 .range([height - X_AXIS_BOTTOM, Y_AXIS_TOP]);
			break;
		case 'ordinal':
			yScale = d3.scaleBand()
							 .domain(yDomain)
							 .range([height - X_AXIS_BOTTOM, Y_AXIS_TOP])
							 .innerPadding(0.1);
			// Width between two ticks is (for instance) pixel-pos
			// at first domain value minus pixel pos at zeroeth domain
			// value:
			yBandWidth = yScale(yDomain[1]) - yScale(yDomain[0]) 

			break;
		default:
			throw `Axis type ${xScaleType} not implemented.`;
		}
	}
	
	/*---------------------------
	| makeAxes 
	-----------------*/
	
	var makeAxes = function() {

		// Create a group, and call the xAxis function to create the axis.
		xAxisGroup = svgSel.append("g")
			 .attr("class", "axis")
			 .attr("id", xAxisGrpName)
			 .attr("transform", `translate(0, ${height - X_AXIS_BOTTOM})`)
			 .call(d3.axisBottom(xScale));
		
		if (xSubclass !== null ) {
			xAxisGroup.classed(xSubclass, true)
		}
		
		// For ordinal X-axes: rotate tick labels by 45%
		// and move them to center between x-axis ticks:
		if (xScaleType === 'ordinal') {
			
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
		}
		
		/* ---------------------------- Y AXIS ---------------------------- */		
		
		// Create a group, and call the yAxis function to create the axis:
		yAxisGroup = svgSel.append("g")
			 .attr("class", "axis")
			 .attr("id", yAxisGrpName)
			 .attr("transform", `translate(${Y_AXIS_LEFT}, 0)`)	
		     .call(d3.axisLeft(yScale)
		    		 .tickFormat(d3.format("d")))
		    		 //****.tickFormat(d3.format(".0d")))
		    		 //****.tickFormat(d3.precisionRound(1,100)));

		if (ySubclass !== null ) {
			yAxisGroup.classed(ySubclass, true)
		}
	}
	
	/*---------------------------
	| makeAxesCaptions 
	-----------------*/
	
	var makeAxesCaptions = function() {
		/*
		 * Add axes labels for the axes. These
		 * are not the tick labels, but the captions.
		 */
		
		let xAxisLabel = svgSel.append("text")
						.attr("class", "x label")
						.attr("id", xAxisLabelId)
						.attr("text-anchor", "middle")
						.attr("x", 2*width / 3.0)
						.attr("y", height + 55)
						.text(xAxisLabel)
						
		let yAxisLabel = svgSel.append("text")
						.attr("class", "axis y label")
						.attr("id", yAxisLabelId)
						.attr("x", 5)
						.attr("y", -5)
						.text(yAxisLabel)
	}
	
	/*---------------------------
	| uniqueNum 
	-----------------*/
	
	var uniqueNum = function() {
		return (new Date).getTime() + Math.random().toString().substring(2) ;
	}
	
	/*---------------------------
	| makeUnselectable 
	-----------------*/
	
	var makeUnselectable = function(d3Sel) {
		
		d3Sel.style("-webkit-touch-callout", "none"); /* iOS Safari */
		d3Sel.style("-webkit-user-select", "none");   /* Chrome/Safari/Opera */
		d3Sel.style("-khtml-user-select", "none");    /* Konqueror */
		d3Sel.style("-moz-user-select", "none");      /* Firefox */
		d3Sel.style("-ms-user-select", "none");       /* Internet Explorer/Edge */
	}
	
	
	return constructor(coordInfo);
}

export { CoordinateSystem };
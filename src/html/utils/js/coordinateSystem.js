import * as d3 from "./d3.min";

var CoordinateSystem = function(coordInfo) {
	/*
	 * Draw a coordinate system in a given SVG.
	 * All parameters are passed in one object.
	 * 
	 * Required properties are:
	 * 
	 *      o the SVG element to draw in,
	 *      o the scale type for both axes, and 
	 *      o the domain for both axes.
	 * 
	 * Optionally the parameter objects may also 
	 * hold these properties 
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
	
	let svg 	  = coordInfo.svg;
	
	let height    = null;
	let width     = null;
	
	let yAxis     = null;
	let xScale    = null;
	let yScale    = null;
	let xDomain   = null;
	let yDomain   = null;
	
	let bandWidth = null; // width in pixels between two x-axis ticks.
	
	let coordSysSel     = null;
	
	let xAxisLabelId = null;
	let xAxisGrpName = null;
	
	let yAxisLabelId = null;
	let yAxisGrpName = null;
	
	let X_AXIS_LEFT       = 0;
	let X_AXIS_RIGHT      = 30;
	let X_AXIS_BOTTOM     = 20;

	let Y_AXIS_LEFT       = 50;
	let Y_AXIS_TOP        = 0;
	let Y_AXIS_BOTTOM     = 20;
	
	
	// For a kludge:
	let Y_AXIS_TOP_MARGIN_VAL = 0;
	
	/*---------------------------
	| constructor 
	-----------------*/
	
	var constructor = function() {
		
		xAxisLabelId = "xAxisLbl_" + uniqueNum();
		xAxisGrpName = "xAxisGrpNm" + uniqueNum();

		yAxisLabelId = "yAxisLbl_" + uniqueNum(); 
		yAxisGrpName = "yAxisGrpNm" + uniqueNum();
		
		/* SVG to draw in */
		if ( typeof(coordInfo.svg) !== "undefined" ) {
			svg = coordInfo.svg;
		} else {
			throw("Must pass an SVG element to coordinate system")
		}
		
		/* Height of entire coordinate system; default: fill 
		 * the given SVG's parent: */
		if (typeof(extentDict.height) !== 'undefined') {
			height = extentDict.height; 
		}
		
		/* Width of entire coordinate system; default: fill 
		 * the given SVG's parent: */
		if (typeof(extentDict.width) !== 'undefined') {
			width = extentDict.width; 
		}
		
		
		/* X-Axis placement: */
		if (typeof(extentDict.x.leftPadding) !== 'undefined') {
			X_AXIS_LEFT = extentDict.x.leftPadding; 
		}
		if (typeof(extentDict.x.rightPadding) !== 'undefined') {
			X_AXIS_RIGHT = extentDict.x.rightPadding; 
		}
		if (typeof(extentDict.x.bottomPadding) !== 'undefined') {
			X_AXIS_BOTTOM = extentDict.x.bottomPadding; 
		}
		
		/* Y-Axis placement: */
		if (typeof(extentDict.y.leftPadding) !== 'undefined') {
			Y_AXIS_LEFT= extentDict.y.leftPadding; 
		}
		if (typeof(extentDict.y.topPadding) !== 'undefined') {
			Y_AXIS_TOP = extentDict.y.topPadding; 
		}
		if (typeof(extentDict.y.bottomPadding) !== 'undefined') {
			Y_AXIS_BOTTOM = extentDict.y.bottomPadding; 
		}
		
		
		return {
			xScale : xScale,
			yScale : yScale,
			xBandwidth : xBandWidth,
			yBandwidth : yBandWidth,
			systemSel  : systemSel,
			xLabelsShow: xLabelsShow
		}
	}

	/*---------------------------
	| makeCoordSys 
	-----------------*/
	
	var makeCoordSys = function(extentDict) {
		
		
		/* ---------------------------- X AXIS ---------------------------- */		
		// X Scale:
		
		switch(coordInfo.x.scaleType) {
		case 'linear':
			xScale = d3.scaleLinear()
							 .domain(coordInfo.x.domain)
							 .range([Y_AXIS_LEFT, width - X_AXIS_RIGHT]);
			break;
		case 'ordinal':
			xScale = d3.scaleBand()
							 .domain(coordInfo.x.domain)
							 .rangeRound([Y_AXIS_LEFT, width - X_AXIS_RIGHT])
							 .paddingInner(0.1);
							 
			// Width between two ticks is (for instance) pixel-pos
			// at first domain value minus pixel pos at zeroeth domain
			// value:
			bandWidth = xScale(coordInfo.x.domain[1]) - xScale(coordInfo.x.domain[0]) 

		break;
		default:
			throw `Axis type ${coordInfo.x.scaleType} not implemented.`;
		}
		

		// Y Scale
		switch(coordInfo.y.scaleType) {
		case 'linear':
			yScale = d3.scaleLinear()	
			 			 .domain(coordInfo.y.domain)
						 .range([height - Y_AXIS_BOTTOM, - Y_AXIS_TOP]);
			break;
		case 'ordinal':
			yScale = d3.scaleBand()
							 .domain(coordInfo.y.domain)
							 .range([Y_AXIS_TOP, height- Y_AXIS_BOTTOM])
							 .innerPadding(0.1);
			break;
		default:
			throw `Axis type ${coordInfo.x.scaleType} not implemented.`;
		}
		
		// Make the visual coordinate system:
		
		// Create a group, and call the xAxis function to create the axis.
		let xAxisGroup = svg.append("g")
			 .attr("class", "axis")
			 .attr("id", coordInfo.x.axisGrpName)
			 .attr("transform", `translate(${X_AXIS_LEFT}, ${height - X_AXIS_BOTTOM})`)
			 .call(d3.axisBottom(xScale));
		
		if (typeof(coordInfo.x.subclass) !== 'undefined' ) {
			xAxisGroup.classed(coordInfo.x.subclass, true)
		}
		
		// For ordinal X-axes: rotate tick labels by 45%
		// and move them to center between x-axis ticks:
		if (coordInfo.x.scaleType === 'ordinal') {
			
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
		
		// Create a group, and call the xAxis function to create the axis:
		let yAxisGroup = svg.append("g")
			 .attr("class", "axis")
			 .attr("id", coordInfo.y.axisGrpName)
			 .attr("transform", `translate(${Y_AXIS_LEFT}, ${Y_AXIS_TOP_MARGIN_VAL})`)	
		     .call(d3.axisLeft(yScale));

		if (typeof(coordInfo.y.subclass) !== 'undefined' ) {
			yAxisGroup.classed(coordInfo.y.subclass, true)
		}
		
		
		/* -------------------------- Axis Labels (for Axes themselves, not ticks) ----------- */
		
		let xAxisLabel = svg.append("text")
						.attr("class", "x label")
						.attr("id", coordInfo.x.axisLabelId)
						.attr("text-anchor", "middle")
						.attr("x", 2*width / 3.0)
						.attr("y", height + 55)
						.text(coordInfo.x.axisLabel)
						
		let yAxisLabel = svg.append("text")
						.attr("class", "axis y label")
						.attr("id", coordInfo.y.axisLabelId)
						.attr("x", 5)
						.attr("y", -5)
						.text(coordInfo.y.axisLabel)
						
		makeUnselectable(d3.selectAll('.axis text'));
		makeUnselectable(d3.selectAll('.x.label'));
		makeUnselectable(d3.selectAll('.y.label'));
		
		coordSysSel = d3.selectAll(d3.merge([xAxisGroup.nodes(), 
		                                     yAxisGroup.nodes(), 
		                                     xAxisLabel.nodes(), 
		                                     yAxisLabel.nodes()]));
		
		return {xScale    : xScale,
				yScale    : yScale,
				bandWidth : bandWidth,
				coordSysSel : coordSysSel 
			   }
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
		
		d3Sel.attr("-webkit-touch-callout", "none"); /* iOS Safari */
		d3Sel.attr("-webkit-user-select", "none");   /* Chrome/Safari/Opera */
		d3Sel.attr("-khtml-user-select", "none");    /* Konqueror */
		d3Sel.attr("-moz-user-select", "none");      /* Firefox */
		d3Sel.attr("-ms-user-select", "none");       /* Internet Explorer/Edge */
	}
	
	
	return constructor();
}

export { CoordinateSystem };
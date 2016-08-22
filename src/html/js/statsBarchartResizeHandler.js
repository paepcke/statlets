StatsBarchartResizeHandler = function(svg) {
	
	var svg = svg;    // may be undefined; if so callers need to call setSvg() before operating.
	
	var drag = null;
	var allowResize = false;
	
	var BAR_WITH = 10;
	
	/*---------------------------
	| constructor 
	-----------------*/

	var constructor = function() {
		
		if (typeof(svg) === 'undefined') {
			throw 'Must pass valid SVG element to StatsBarchartResizeHandler()'; 
		}
		
		// Define drag behavior
        drag = d3.behavior.drag()
           .on("drag", dragmove);
		
		return {allowResize			: allowResize,         // getter
			    setAllowResize      : setAllowResize,      // setter
			    setSvg				: setSvg,              // setter
			    dragmove		    : dragmove,
			    drag				: drag,      // one can go: drag or dragmove. Likely 'drag'
				}
	}


	/*---------------------------
	| allowDrag 
	-----------------*/
	
	var allowResize = function() {
		return _allowResize;
	}
	
	/*---------------------------
	| setAllowResize
	-----------------*/
	
	var setAllowResize = function(newVal) {
		_allowResize = newVal;
	}
	
	/*---------------------------
	| setSvg 
	-----------------*/
	
	var setSvg = function(newSvg) {
		svg = newSvg;
	}
	
	/*---------------------------
	| dragmove 
	-----------------*/

	var dragmove = function(d3DomElSel) {

		let evt = d3.event;
		let x = evt.x;
		let y = evt.y;
		
		d3DomElSel.attr('height', y);
			
	}
	

	/*---------------------------
	| createBar 
	-----------------*/

	var createBar = function(x, y, width, className) {
		/*
		 * Create a rect at x,y, and class it with className.
		 * x,y are upper-left-corner-based SVG coordinates.
		 * 
		 *  :param x: pixel horizontal position of new lower-left
		 *  		corner of the new rect relative	to SVG origin.
		 *  :type x : float
		 *  :param y: pixel vertical position of new rect relative
		 *  			to SVG origin.
		 *  :type y : float
		 *  :param width: bar width
		 *  :type width: float
		 *  :param className: CSS class of point.
		 *  :type className : string
		 */
		
		if (typeof(width) !== 'undefined') {
			x = x + Math.round(width/2.);
		}
		
		let rect = svg.append("rect")
		  .attr("transform", "translate(" + x + "," + y + ")")
		  .attr("width", BAR_WITH)
		  .attr("xOrig", x)      // save this original x-position
		  .attr("yOrig", y)      // save this original y-position
		  .attr("class", className)
		  .style("cursor", "pointer")
		  .call(drag);
	}
	
	return(constructor());
	
}

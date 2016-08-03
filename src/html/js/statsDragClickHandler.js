StatsDragClickHandler = function(svg) {
	
	var svg = svg;    // may be undefined; if so callers need to call setSvg() before operating. 
	var drag = null;
	var _allowDrag = {vertical   : false,
						  horizontal : false} 
	var _allowDotCreation = true;
	
	var DOT_RADIUS               = 10;
	
	/*---------------------------
	| constructor 
	-----------------*/

	var constructor = function() {
		
		if (typeof(svg) === 'undefined') {
			throw 'Must pass valid SVG element to StatsDragClickHandler()'; 
		}
		
		svg.on("click", click);
		
		// Define drag behavior
        drag = d3.behavior.drag()
           .on("drag", dragmove);
		
		return {createDot			: createDot,
			    allowDrag       	: allowDrag,           // getter
			    setAllowDrag    	: setAllowDrag,        // setter
			    allowDotCreation    : allowDotCreation,    // getter
			    setAllowDotCreation : setAllowDotCreation, // setter
			    setSvg				: setSvg,              // setter    
				}
	}


	/*---------------------------
	| allowDrag 
	-----------------*/
	
	var allowDrag = function() {
		return _allowDrag;
	}
	
	/*---------------------------
	| setAllowDrag 
	-----------------*/
	
	var setAllowDrag = function(newVal) {
		
		if (typeof(newVal) !== 'object') {
			throw `AllowDrag value must be boolean, not '${newVal}'` 
		}
		
		if (typeof(newVal.vertical) !== 'undefined') {
			_allowDrag.vertical = newVal.vertical;
		}
		
		if (typeof(newVal.horizontal) !== 'undefined') {
			_allowDrag.horizontal = newVal.horizontal;
		}
	}
	

	/*---------------------------
	| setSvg 
	-----------------*/
	
	var setSvg = function(newSvg) {
		svg = newSvg;
	}
	
	/*---------------------------
	| allowDotCreation
	-----------------*/
	
	var allowDotCreation = function() {
		return _allowDotCreation;
	}
	

	/*---------------------------
	| setAllowDotCreation
	-----------------*/
	
	var setAllowDotCreation = function(newVal) {
		
		if (typeof(newVal) !== 'boolean') {
			throw `AllowDotCreation value must be boolean, not '${newVal}'` 
		}
		
		_allowDotCreation = newVal;
	}
	
	
	/*---------------------------
	| click 
	-----------------*/
	
	var click = function () {
		// Ignore the click event if it was suppressed
		if (d3.event.defaultPrevented) return;

		if (! _allowDotCreation) return;
		
		// Extract the click location:    
		var point = d3.mouse(this)
		var     p = {x: point[0], y: point[1] };

		// Append a new point
		createDot(p.x, p.y, 'dot')
	}

	/*---------------------------
	| dragmove 
	-----------------*/

	var dragmove = function(d) {

		let evt = d3.event;
		let x = evt.x;
		let y = evt.y;
		
		if (! _allowDrag.horizontal) {
			x = d3.select(this).attr('xOrig');
		}
		
		if (! _allowDrag.vertical) {
			y = d3.select(this).attr('yOrig');
		}
			
		d3.select(this).attr("transform", "translate(" + x + "," + y + ")");
	}
	

	/*---------------------------
	| createDot 
	-----------------*/

	var createDot = function(x, y, className) {
		/*
		 * Create a circle at x,y, and class it with className.
		 * x,y are upper-left-corner-based SVG coordinates.
		 * 
		 * Adds two D3 attributes to the circle: xOrig, and yOrig.
		 * They hold the passed-in (i.e. initial) x/y coordinates. Used
		 * in dragmove to constrain dragging in x or y directions. 
		 */
		
		let circle = svg.append("circle")
		  .attr("transform", "translate(" + x + "," + y + ")")
		  .attr("r", DOT_RADIUS)
		  .attr("xOrig", x)      // save this original x-position
		  .attr("yOrig", y)      // save this original y-position
		  .attr("class", className)
		  .style("cursor", "pointer")
		  .call(drag);
	}
	
	
	return(constructor());
	
}
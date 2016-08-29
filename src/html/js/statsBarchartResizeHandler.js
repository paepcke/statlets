var StatsBarchartResizeHandler = function(svg) {
	
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
        drag = d3.drag()
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
		let y  = evt.y;
		let dy = evt.dy;
		let newY = parseFloat(d3DomElSel.attr('y')) + dy;
		let newHeight = parseFloat(d3DomElSel.attr('height')) - dy;
		
		if ( newHeight < 0) {
			return;
		}
		
		d3DomElSel.attr('y', newY);
		d3DomElSel.attr('height', newHeight);
			
	}
		
	return(constructor());
	
}

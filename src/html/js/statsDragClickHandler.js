StatsDragClickHandler = function() {
	
	var _constrainDrag = {vertical   : false,
						  horizontal : false} 
	var _allowDotCreation = true;
	
	/*---------------------------
	| constructor 
	-----------------*/

	var constructor = function() {
		
		return {click               : click,
			    dragmove            : dragmove,
			    constrainDrag       : constrainDrag,       // getter
			    setConstrainDrag    : setConstrainDrag,    // setter
			    allowDotCreation    : allowDotCreation,    // getter
			    setAllowDotCreation : setAllowDotCreation, // setter
				}
	}


	/*---------------------------
	| constrainDrag 
	-----------------*/
	
	var constrainDrag = function() {
		return _constrainDrag;
	}
	
	/*---------------------------
	| setConstrainDrag 
	-----------------*/
	
	var setConstrainDrag = function(newVal) {
		
		if (typeof(newVal) !== 'object') {
			throw `ConstrainDrag value must be boolean, not '${newVal}'` 
		}
		
		if (typeof(newVal.vertical) !== undefined) {
			_constrainDrag.vertical = newVal.vertical;
		}
		
		if (typeof(newVal.horizontal) !== undefined) {
			_constrainDrag.horizontal = newVal.horizontal;
		}
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
		
		if (_constrainDrag.vertical) {
			x = x - evt.dx;
		}
		
		if (_constrainDrag.horizontal) {
			y = y - evt.dy;
		}
			
		d3.select(this).attr("transform", "translate(" + x + "," + y + ")");
	}
	
	
	return(constructor());
	
}
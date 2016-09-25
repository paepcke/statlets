"use strict";

import * as d3 from "./d3.min";

var StatsBarchartResizeHandler = function (svg) {
	/*
	 * Facility allowing users to make bars in 
	 * a chart larger or smaller.
	 */
	
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

	var dragmove = function(d3DomElSel, lineBar) {
		/*
		 * Given a D3 selection of a bar in a chart,
		 * move the top of the bar to match the 
		 * mouse y-coordinate.
		 * 
		 * If truthy, the lineBar parameter indicates
		 * that bars are made up of line elements, not
		 * rectangle elements. This can be useful if
		 * lines with rounded butts are needed to stick
		 * up above the x axis for very small numbers.
		 * The butts can be used to drag the otherwise
		 * hidden bar.
		 */

		let evt = d3.event;
		let y  = evt.y;
		let dy = evt.dy;
		
		if (typeof(lineBar) === 'undefined') {
			
			// Bar is made of a rectangle:
			
			let newY = parseFloat(d3DomElSel.attr('y')) + dy;
			let newHeight = parseFloat(d3DomElSel.attr('height')) - dy;

			if ( newHeight < 0) {
				return;
			}

			d3DomElSel.attr('y', newY);
			d3DomElSel.attr('height', newHeight);
		} else {
			
			// Bar is made of a line:
			
			let newY    = parseFloat(d3DomElSel.attr('y1')) + dy;
			let xAxisY  = parseFloat(d3DomElSel.attr('y2'))

			if ( newY > xAxisY ) {
				 newY = xAxisY;
			}

			d3DomElSel.attr('y1', newY);
		}
	}
		
	return(constructor());
	
}

export { StatsBarchartResizeHandler };

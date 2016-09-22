"use strict";

import * as d3 from "./d3.min";

var DragHandler = function (svg) {
	/*
	 * Facility allowing users to drag
	 * arbitrary (composite) SVG elements
	 * across the screen. 
	 */
	
	var svg = svg;    // may be undefined; if so callers need to call setSvg() before operating.
	
	var drag = null;
	var allowDrag = false;
	
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
		
		return {dragmove : dragmove,
				}
	}


	/*---------------------------
	| allowDrag 
	-----------------*/
	
	var allowDrag = function() {
		return _allowDrag;
	}
	
	/*---------------------------
	| setAllowResize
	-----------------*/
	
	var setAllowResize = function(newVal) {
		_allowDrag = newVal;
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

	var dragmove = function(d3DomElSel, isSvg) {
		/*
		 * Given a D3 selection move the selected
		 * (possibly composite) SVG element to 
		 * match the mouse.
		 */

		if ( typeof(isSvg) === 'undefined' ) {
			isSvg = false;
		}
		let evt = d3.event;
		let y  = evt.y;
		let x  = evt.x;
		let dy = evt.dy;
		let dx = evt.dx;
		
		let domElX = null;
		let domElY = null;
		
		if ( isSvg ) {
			domElX = parseFloat(d3DomElSel.attr("x"));
			domElY = parseFloat(d3DomElSel.attr("y"));
		} else {
			// These will be strings: "4px", 
			// but parseFloat() handles that:
			domElX = parseFloat(d3DomElSel.style("left"));
			domElY = parseFloat(d3DomElSel.style("top"));
			
		}
		
		let newX = domElX + dx;
		let newY = domElY + dy;

		if ( isSvg ) {
			d3DomElSel.attr("x", newX);
			d3DomElSel.attr("y", newY);
		} else {
			d3DomElSel.style("left", `${newX}px`);
			d3DomElSel.style("top", `${newY}px`);
		}
	}
		
	return(constructor());
	
}

export { DragHandler };

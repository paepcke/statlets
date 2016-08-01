CorrelationViz = function(width, height) {

	var width  = null;
	var height = null;
	var svg    = null;
	var drag   = null;
	
	var constructor = function(vizWidth, vizHeight) {
		
		width  = vizWidth;
		height = vizHeight;
		
		svg = d3.select("#vizDiv").append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("id", "chart")
		.style("border", "1px solid black")
		.on("click", click);
		
        // Add a background
		svg.append("rect")
		.attr("width", width)
		.attr("height", height)
		.style("stroke", "#999999")
		.style("fill", "#F6F6F6")
		
        // Define drag behavior
        drag = d3.behavior.drag()
        .on("drag", dragmove);
		
		return {width  : width,
				height : height
			}
	}

	var click = function (){
		// Ignore the click event if it was suppressed
		if (d3.event.defaultPrevented) return;

		// Extract the click location\    
		var point = d3.mouse(this)
		var     p = {x: point[0], y: point[1] };

		// Append a new point
		svg.append("circle")
		.attr("transform", "translate(" + p.x + "," + p.y + ")")
		.attr("r", "5")
		.attr("class", "dot")
		.style("cursor", "pointer")
		.call(drag);
	}

	var dragmove = function(d) {
		var x = d3.event.x;
		var y = d3.event.y;
		d3.select(this).attr("transform", "translate(" + x + "," + y + ")");
	}

	constructor(width, height)
}
var corrViz = CorrelationViz(500, 600);

CorrelationViz = function(width, height) {

	var width  = width;
	var height = height;
	var svg    = null;	
	var scale  = null;
	var drag   = null;
	var tblObj = null;
	
	var constructor = function() {
		
		let chartDiv = document.getElementById('chartDiv');
		chartDiv.style.width  = `${width}px`;
		chartDiv.style.height = `${height}px`;

		svg = d3.select("#chartDiv").append("svg")
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
		
		// Make the visual coordinate system:
		scale = d3.scale.linear()
						.domain([0,150]) // expenditures between $0 and $150
						.range([0, height]);
		
		
		
		// Define drag behavior
        drag = d3.behavior.drag()
        .on("drag", dragmove);
		
        tblObj = createTable();
        tblObj.classed({table: 'inputTable'});
        document.getElementById('tableDiv').appendChild(tblObj.value());
        
        
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
	
	var createTable = function() {
		let headerRow = ['Spender', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 
		                 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
		let data      = [['Monica', 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
		                 ['Daniel', 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125]
						]
		tblObj = TableManager(data, headerRow);
		tblObj.classed({table : 'inputTable',
						 cell : ['largeLabel', undefined, 0]
						});
		return tblObj;
	}

	constructor(width, height)
}
var corrViz = CorrelationViz(700, 400);

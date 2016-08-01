CorrelationViz = function(width, height) {

	// Instance variables:
	
	var width  = width;
	var height = height;
	var svg    = null;	
	var xScale = null;
	var yScale = null;	
	var xAxis  = null;
	var yAxis  = null;
	var drag   = null;
	var tblObj = null;
	
	// Constants:
	
	var X_AXIS_LEFT_PADDING      = 40; // X axis distance left SVG edge
	var X_AXIS_BOTTOM_PADDING    = 50; // X axis distance bottom SVG edge
	var X_AXIS_RIGHT_PADDING     = 50; // X axis distance right SVG edge
	
	var Y_AXIS_BOTTOM_PADDING    = 60; // Y axis distance from SVG bottom
	var Y_AXIS_TOP_PADDING       = 10; // Y axis distance from SVG top
	var Y_AXIS_LEFT_PADDING	     = 40; // Y axis distance from left SVG edge
	
	var constructor = function() {
		
		let chartDiv = document.getElementById('chartDiv');
		chartDiv.style.width  = `${width}px`;
		chartDiv.style.height = `${height}px`;

		svg = d3.select("#chartDiv").append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("id", "chart")
		.attr("class", "chartSVG")
		.on("click", click);
		
        // Add a background
		svg.append("rect")
		.attr("width", width) //****
		.attr("height", height)
		.attr("class", "chartSVG")
		.style("fill", "#F6F6F6")
		
		makeCoordSys();

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
	
	var makeCoordSys = function() {
		
		/* ---------------------------- X AXIS ---------------------------- */		
		
		// Make the visual coordinate system:
		xScale = d3.scale.linear()
			 			 .domain([0,150]) // expenditures between $0 and $150 **** get from table data
						 .range([0, width - X_AXIS_RIGHT_PADDING]);
		
		xAxis = d3.svg.axis()
				      .scale(xScale)
				      .orient("bottom");
		
		// Create a group, and call the xAxis function to create the axis:
		svg.append("g")
			 .attr("class", "axis")
			 .attr("transform", `translate(${X_AXIS_LEFT_PADDING}, ${height - X_AXIS_BOTTOM_PADDING})`)
		     .call(xAxis);
		
		/* ---------------------------- Y AXIS ---------------------------- */		
		yScale = d3.scale.linear()
			 			 .domain([0,150]) // expenditures between $0 and $150 **** get from table data
						 .range([height - Y_AXIS_BOTTOM_PADDING, Y_AXIS_TOP_PADDING]);
		
		yAxis = d3.svg.axis()
				      .scale(yScale)
				      .orient("left");
		
		// Create a group, and call the xAxis function to create the axis:
		svg.append("g")
			 .attr("class", "axis")
			 //.attr("transform", "translate("[Y_AXIS_LEFT_PADDING + (height - Y_AXIS_TOP_PADDING) + ")")	
			 .attr("transform", `translate(${Y_AXIS_LEFT_PADDING}, ${Y_AXIS_TOP_PADDING})`)	
		     .call(yAxis);
		
		
		
	}

	constructor(width, height)
}
var corrViz = CorrelationViz(700, 400);

<!DOCTYPE html>
<meta charset="utf-8">
<title>svg button</title>
<head>
	<link rel="stylesheet" type="text/css" href="svgButton.css">
	<script type="text/javascript" src="js/svgButton.js"></script>	
</head>
<body>

<!-- From: http://bl.ocks.org/pbogden/7487564 -->

<script src="https://d3js.org/d3.v4.min.js"></script>
<script src="button.js"></script>

<script>
var width = 960,
    height = 500;

var svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)

var g = svg.append('g')
    .attr('class', 'button')
    .attr('transform', 'translate(' + [width / 2, height / 2] +')')

var g2 = svg.append('g')
    .attr('class', 'button')
    .attr('transform', 'translate(' + [width / 4, height / 4] +')')

var text = g.append('text')
    .text('Click me')

var text2 = g2.append('text')
    .text('Click me too')

button()
  .container(g)
  .text(text)
  .count(0)
  .cb(function() { console.log("I've been clicked!") })();

// Button "count" keeps things unique
button()
  .container(g2)
  .text(text2)
  .count(1)
  .cb(function() { console.log("I've been clicked too!") })();
  
</script>
</body>
</html>  
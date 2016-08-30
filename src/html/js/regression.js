/**
 *
 * TODO: 
 *   o Button to show true MSE
 *   o Make points movable? ==> surface changes.
 *   o Fix pixel offset.
 *   o Add the objective function
 *   o Test with 2 points
 *   o Add two points ? But watch formulas.
 */

RegressionSim = function() {
	
	var NS = "http://www.w3.org/2000/svg";
	var svgArea;
	
	//*******
	var gridSize = 20;
	this.gridSize = 20;
	//*******	
	var halfGridS = Math.round(gridSize/2.0);
	var gridLineWidth    = 1;
	var gridLineOpacity  = 0.2;
	
	// Steps for the 3D surface and search
	// for minima of m/b:
	//***var meshStep = 0.1;
	var meshStep = 0.5;
	
	var arrowDefaultWidth = 1;
	var arrowDefaultColor = 'black';
	
	// Will be replaced by the SVG 
	// obj that implements the coordinate
	// system:
	var coordSys = {'topLeftX'  : gridSize,
					'topLeftY'  : 0,
					'width'     : 500,
					//'height'    : 370	};
					'height'    : 500	};

	var axisStrokeWidth   = 5;
	var axisStrokeOpacity = 0.5;
	
	//******
	var yAxisHeight 	  = coordSys.height - halfGridS;
	this.yAxisHeight 	  = coordSys.height - halfGridS;
	//******
	
	//******
	var yAxisLeftPadding  = 2* gridSize;
	this.yAxisLeftPadding  = 2* gridSize;
	//******
	
	var xAxisWidth        = coordSys.width - gridSize;

	var maxCoordSysX      = Math.round(coordSys.width / gridSize);
	var maxCoordSysY      = Math.round(coordSys.height/ gridSize);
	
	var xAxisLabel = "Distance";
	var yAxisLabel = "Potatoes";
	
	var currCoordSlope = 0.5;
	var currCoordIntercept = 3.0;
	var currPixelCoordSlope;
	var currPixelCoordIntercept;

	// Function line object:
	var line = null;
	var lineStrokeWidth = 4;
	
	var lineDragHandle;
	var lineDragHandleWidth      = gridSize;
	var lineDragHandleHeight     = gridSize;
	var lineDragHandleHalfHeight = Math.round(lineDragHandleHeight / 2.0);
	var lineDragHandleRestColor  = 'yellow';
	var lineDragHandleMoveColor  = 'green';
	var lineDragHandleState = {'x' : 0, 'y' : 0, 'dragging' : false};
	
	var rotateHandle;
	var rotateHandleWidth      = gridSize;
	var rotateHandleHeight     = gridSize;
	var rotateHandleHalfWidth  = Math.round(rotateHandleWidth/ 2.0);
	var rotateHandleHalfHeight = Math.round(rotateHandleHeight/ 2.0);
	var rotateHandleRestColor  = 'yellow';
	var rotateHandleMoveColor  = 'green';
	var rotateHandleState = {'x' : 0, 'y' : 0, 'dragging' : false};

	
	// Array of objs: {'x' : <val>, 'y' : <val>, 'id' : <val>}:
	var dataPtSpecArr = [];
	// Array of SVG data point objects:
	var dataPtObjArr  = [];
	var dataPtRadius  = 10; // pixels
	var dataPtFill    = 'darkblue';
	var dataPtStroke  = 'yellow';
	
	var errLineStrokeWidth = 2;
	// Horizontal space between error line and its numeric value text:
	var errMagPadding = 4
	
	// Error quantities: mean absolute error, mean square error,
	// and root mean square error:
	var MEA;
	var MSE;
	var RMSE;
	
	// The minima for each of mae/mse/rmse. Computed
	// in setup.py via computeErrorEstimators:
	var minMae;
	var minMsa;
	var minRmsa;
	
	var theMBForMinMae  = null;
	var theMBForMinMse  = null;
	var theMBForMinRmse = null;

	// Array of objects that hold the mae/mse/rmse
	// for every pair of m and b. Set by setup()
	// via computeErrorEstimators:
	//**********
	//var resMatrix;
	this.resMatrix;
	//**********

	// Object in which to store line slope/intercept,
	// handle positions, and other quantities. Used
	// by saveState() and restore(state).
	var savedState = {};
	
	this.construct = function() {
		svgArea = document.getElementById('svgArea');
	}();
	
	this.setup = function() {
		// Create a reusable arrow head:
		arrowHead = createArrowHead();
		svgArea.appendChild(arrowHead);
		
		// Create grid lines, axes, and axis labels:
		coordSys = makeCoordSys();
		svgArea.appendChild(coordSys);
				
		// We couldn't place the axis labels when they
		// were created, b/c their width/heights were 
		// unknown at the point. Move them now:
		
		var xLabel = document.getElementById('xLabel');
		var xLabelBox = xLabel.getBBox();
		// The x/y of labels are actually arrays of
		// SVGLength instances; grab the first (and only)
		// of those, and get it's value:
		var currY     = xLabel.y.baseVal[0].value;
		// Add the label's height to its y to move
		// it below the x axis:
		xLabel.setAttribute('y', currY + xLabelBox.height);

		// Rotate and move the y-axis label:
		// Create a new SVG Transform:
		var yLabel    = document.getElementById('yLabel');
		var yLabelBox = yLabel.getBBox();
		var rotationTransform = svgArea.createSVGTransform();
		rotationTransform.setRotate(-90, halfGridS + yLabelBox.height, yLabelBox.width);
		// Add the empty rotation transform to the yLabel list of 
		// SVGTransform objects as item(0):
		yLabel.transform.baseVal.initialize(rotationTransform);
		
		// I do not understand what's x vs. y after the
		// above transform; the two lines below are empirically
		// determined. But they work even when changing
		// the y-axis label:
		yLabel.setAttribute('x', 0);
		yLabel.setAttribute('y', yLabelBox.width - halfGridS - 5);
		
	
		// Draw the datapoints so that their error
		// lines are below the function line, which we
		// will draw below:
		dataPtSpecArr = [{'x' : 4,  'y' : 13, 'id' : 'pt1', 'title' : "Abigail devoured 13 potatoes"},
		                 {'x' : 8,  'y' : 9,  'id' : 'pt2', 'title' : "Bob enjoyed 9 potatoes"},
		                 {'x' : 15, 'y' : 12, 'id' : 'pt3', 'title' : "Clara's put away 12 potatoes"},
		                 ];
		
/*		dataPtSpecArr = [{'x' : 4,  'y' : 5, 'id' : 'pt1', 'title' : "Abigail devoured 13 potatoes"},
		                 {'x' : 8,  'y' : 9,  'id' : 'pt2', 'title' : "Bob enjoyed 9 potatoes"},
		                 ];
*/		
		placeDataPoints(dataPtSpecArr);
		
		// Draw the initial function line:
		line = drawFuncLine(currCoordSlope, currCoordIntercept);
		adjustErrorLines(currCoordSlope, currCoordIntercept);
		svgArea.appendChild(line);
		
		// Draw line drag handle:
		lineDragHandle = makeLineDragHandle();
		svgArea.appendChild(lineDragHandle);
		lineDragHandleState.x = lineDragHandle.x.baseVal.value;
		lineDragHandleState.y = lineDragHandle.y.baseVal.value;
		
		rotateHandle = makeRotateHandle();
		svgArea.appendChild(rotateHandle);
		rotateHandleState.x = rotateHandle.x.baseVal.value;
		rotateHandleState.y = rotateHandle.y.baseVal.value;
		
		// Compute the minima for mae/mse/rmse, and 
		// the matrix of all mae/mse/rmse for every 
		// pair of m/b. The function returns:
		//     {
		// 		'minMae'  : minMae,
		//		'minMse'  : minMse,
		//		'minRmse' : minRmse,
		//		'resMatrix' : resMatrix
		//     }

		var res = findMinima();
		minMae  = res.minMae;
		minMse  = res.minMse;
		minRmse = res.minRmse;
		resMatrix = res.resMatrix;
		
		// Make the formulas reflect initial line
		// slope/intercept:
		adjustErrFormulas();
		// Make the 'current equation' reflect initial m/b:
		adjustErrFormulaResultsOnly();
	}
	
	//------------------------------  Event Handlers -------------------------
	
	this.lineMoveHandleMouseDown = function(evt) {
		evt.preventDefault();
		evt.target.style.cursor = 'move';
		lineDragHandleState.dragging = true;
		lineDragHandleState.x = evt.clientX;
		lineDragHandleState.y = evt.clientY;
		evt.target.setAttribute('fill', lineDragHandleMoveColor);
		document.getElementById('svgArea').addEventListener('mousemove', regSim.lineMoveHandleMove);
		document.getElementById('svgArea').addEventListener('mouseup', regSim.lineMoveHandleMouseUp);
	}

	this.lineMoveHandleMove = function(evt) {
		evt.preventDefault();
		if (lineDragHandleState.dragging) {
			// Diff between mouse and upper edge of line drag handle:
			var dY = evt.clientY - lineDragHandle.y.baseVal.value;
			// Want mouse right in middle of handle:
			dY -= lineDragHandleHalfHeight;
			var newY= lineDragHandle.y.baseVal.value + dY;
			if ((newY > yAxisHeight - lineDragHandleHalfHeight) ||
				(newY < lineDragHandleHeight)) {
				// Don't allow handle below x axis or into y-axis arrow head:
				return;
			}
			lineDragHandle.y.baseVal.value = newY;
			lineDragHandleState.y = newY;
			currPixelCoordIntercept = newY;
			currCoordIntercept      = pixels2Intercept(newY);
			
			var newXY = moveRotateHandleDelta(0, -dY);
			drawFuncLineGivenPixelDims(currPixelCoordSlope, newY);
			// Too slow to redraw the formulas during mouse-down.
			// But we can redraw just the final sum:
			adjustErrFormulaResultsOnly();
			adjustErrorLines(currPixelCoordSlope, currPixelCoordIntercept);
		}
	}
	
	this.lineMoveHandleMouseUp = function(evt) {
		adjustErrFormulas();
		evt.target.style.cursor = 'default';
		lineDragHandleState.dragging = false;
		lineDragHandleState.x = evt.clientX;
		lineDragHandleState.y = evt.clientY;
		lineDragHandle.setAttribute('fill', lineDragHandleRestColor);
		document.getElementById('svgArea').removeEventListener('mousemove', regSim.lineMoveHandleMove);
		document.getElementById('svgArea').removeEventListener('mouseup', regSim.lineMoveHandleMouseUp);
	}

	this.rotateHandleMouseDown = function(evt) {
		evt.preventDefault();
		evt.target.style.cursor = 'move';
		rotateHandleState.dragging = true;
		rotateHandleState.x = evt.clientX;
		rotateHandleState.y = evt.clientY;
		evt.target.setAttribute('fill', rotateHandleMoveColor);
		document.getElementById('svgArea').addEventListener('mousemove', regSim.rotateHandleMove);
		document.getElementById('svgArea').addEventListener('mouseup', regSim.rotateHandleMouseUp);
	}
		
	this.rotateHandleMove = function(evt) {
		evt.preventDefault();
		if (rotateHandleState.dragging) {
			
			// Diff between mouse and upper edge of rotation drag handle:
			var dXUpperLeft = rotateHandleState.x + evt.clientX;

			// Diff between mouse and left edge of rotation drag handle:
			var dYUpperLeft = rotateHandleState.y - evt.clientY;
			
			var newXY = moveRotateHandleDelta(dXUpperLeft, dYUpperLeft);
			var newPixelLeftEdge  = newXY.x;
			var newPixelUpperEdge = newXY.y;

			// Remember mouse position for next call into this move method:
			rotateHandleState.x = evt.clientX;
			rotateHandleState.y = evt.clientY;
	
			var newSlope = computeSlopeFromRotateHandle(newPixelLeftEdge, newPixelUpperEdge);
			
			// Update our ready-at-hand values of coord and pixel slopes:
			var newPixelSlope = slope2Pixels(newSlope);
			currPixelCoordSlope = newPixelSlope;
			currCoordSlope      = newSlope;
			
			drawFuncLineGivenPixelDims(newPixelSlope, currPixelCoordIntercept);
			// Too slow to redraw the formulas during mouse-down.
			// But we can redraw just the final sum:
			adjustErrFormulaResultsOnly();
			adjustErrorLines(currPixelCoordSlope, currPixelCoordIntercept);
		}
	}

	var moveLineDragHandlePixels = function(yPixels) {
		lineDragHandle.y.baseVal.value = yPixels;
	}
	
	var moveLineDragHandleCoords = function(yCoord) {
		var pixelCoords = coordPt2Pixels(0, yCoord);
		moveLineDragHandlePixels(pixelCoords.y);
	}
	
	var moveRotateHandlePixels = function(yPixels) {
		rotateHandle.y.baseVal.value = yPixels;
	}
	
	var moveRotateHandleCoords = function(yCoord) {
		var pixelCoords = coordPt2Pixels(xAxisWidth, yCoord);
		moveRotateHandlePixels(pixelCoords.y);
	}
	
	var moveRotateHandleDelta = function(dx, dy) {
		//*** This method likely causes the rotate handle problems.

		// Candidate new pos of handle's left edge:
		var newPixelLeftEdge = rotateHandle.x.baseVal.value + dx;
		// But don't let handle go more than half into y-axis on left:
		newPixelLeftEdge = Math.max(newPixelLeftEdge, yAxisLeftPadding + rotateHandleHalfWidth);
		// ... nor with any of its body beyond the end of the x axis:
		newPixelLeftEdge = Math.min(newPixelLeftEdge, xAxisWidth - rotateHandleHalfWidth);

		// Candidate new pos of handle's upper edge (subtract b/c y grows down):
		var newPixelUpperEdge = rotateHandle.y.baseVal.value - dy;
		// Don't move the handle below the x axis; just allow middle of
		// handle to be on the x-axis:
		newPixelUpperEdge = Math.min(newPixelUpperEdge, (yAxisHeight - rotateHandleHalfHeight)); 
		// Don't allow part of the handle to move above the coord sys either:
		newPixelUpperEdge = Math.max(newPixelUpperEdge, 0);

		// Move the rotate handle:
		rotateHandle.x.baseVal.value = newPixelLeftEdge;
		rotateHandle.y.baseVal.value = newPixelUpperEdge;

		return {'x' : newPixelLeftEdge, 'y' : newPixelUpperEdge};
	}
	
	var computeSlopeFromRotateHandle = function(newPixelLeftEdge, newPixelUpperEdge) {
		/**
		 * Given x (left edge) and y (top edge) of rotate handle
		 * position, return the *coordinate* slope.
		 */
			// Prepare to move the line's end point to land in center
			// of new handle position; get (user coordinates) of that 
			// center point:
			var rotHandleCoordPt = pixelsPt2Coord(newPixelLeftEdge  + rotateHandleHalfWidth, 
												  newPixelUpperEdge + rotateHandleHalfHeight);
			var newSlope = (rotHandleCoordPt.y - currCoordIntercept) / rotHandleCoordPt.x;
			return newSlope;
	}
	
	var computePixelSlopeFromLine = function() {
		return line.y.baseVal.value / line.x.baseVal.value;
	}
	
	this.rotateHandleMouseUp = function(evt) {
		adjustErrFormulas();
		evt.target.style.cursor = 'default';
		rotateHandleState.dragging = false;
		rotateHandle.setAttribute('fill', rotateHandleRestColor);
		document.getElementById('svgArea').removeEventListener('mousemove', regSim.lineMoveHandleMove);
		document.getElementById('svgArea').removeEventListener('mouseup', regSim.lineMoveHandleMouseUp);
	}
	
	this.seeBestMaeButtonMouseDown = function(evt) {
		saveState();
		showBestByObjectiveMeasure('mae');
	}

	this.seeBestMseButtonMouseDown = function(evt) {
		saveState();
		showBestByObjectiveMeasure('mse');
	}

	this.seeBestRmseButtonMouseDown = function(evt) {
		saveState();
		showBestByObjectiveMeasure('rmse');
	}
	
	this.seeBestButtonMouseUp = function(evt) {
		restoreState();
	}

	var showBestByObjectiveMeasure = function(objective) {
		/**
		 * Given a minimization objective, which can be
		 * 'mae', 'mse', or 'rmse', look up the optimal
		 * slope and intercept, and redraw the line and 
		 * handles. Also calls the adjustment functions
		 * for error lines and formula refresh.
		 */

		var optimalMB;
		if (objective == 'mae') {optimalMB = mbForMinMae()}
		else if (objective == 'mse') {optimalMB = mbForMinMse()}
		else if (objective == 'rmse') {optimalMB = mbForMinRmse()};

		var pixelM = slope2Pixels(optimalMB.m);
		var pixelB = intercept2Pixels(optimalMB.b);
		
		moveLineDragHandlePixels(pixelB);
		moveRotateHandlePixels(pixelM * xAxisWidth + pixelB);
		
		currCoordSlope      	= optimalMB.m;
		currCoordIntercept  	= optimalMB.b;
		currPixelCoordSlope 	= pixelM;
		currPixelCoordIntercept = pixelB;
		
		drawFuncLineGivenPixelDims(currPixelCoordSlope, currPixelCoordIntercept);
		// This call must come before redrawing the formula
		// results:
		adjustErrorLines(currPixelCoordSlope, currPixelCoordIntercept);
		// Too slow to redraw the formulas during mouse-down.
		// But we can redraw just the final sum:
		//****adjustErrFormulaResultsOnly();
		adjustErrFormulas();
	}
	
	//------------------------------  Drawing the Function Line -------------------------
	
	
    var drawFuncLine = function(slope, intercept, xMax) {
    	/**
    	 * Given slope and intercept, draw a line from 
    	 * the y-intercept to either the end of the x-axis
    	 * (if xMax is not provided), or to xMax, if it
    	 * is. All units are in terms of the visible grid.
    	 * This method converts to pixel dimension, and 
    	 * accounts for canvas y-dimension growing downward.
    	 */
    
    	if (xMax === undefined) {
    		pixelxMax = xAxisWidth;
    	} else {
    		// Add one gridSize, b/c the y-axis is shifted
    		// right by one grid width to make room for the
    		// y-axis label:
    		pixelxMax = gridSize + gridSize * xMax;
    	}
    	
    	var pixelIntercept = intercept2Pixels(intercept);
    	var pixelSlope     = slope2Pixels(slope);
    	return drawFuncLineGivenPixelDims(pixelSlope, pixelIntercept, pixelxMax);
    }
    
    var drawFuncLineGivenPixelDims = function(pixelSlope, pixelIntercept, pixelxMax) {

    	if (pixelxMax === undefined) {
    		pixelxMax = xAxisWidth;
    	}
    	
    	if (line === null) {
    		line = document.createElementNS(NS, 'line');
    	}
    	
    	// Ensure that right most line point isn't 
    	// lower than x-axis:
    	var y2 = Math.min(pixelSlope * pixelxMax + pixelIntercept, yAxisHeight);
    	// If endpoint-y gets stopped at zero, must also update x:
    	if (y2 === yAxisHeight) {
    		pixelxMax = ((y2 - pixelIntercept)/pixelSlope);
    	}
    	
    	line.setAttribute('stroke', 'black');
    	line.setAttribute('stroke-width', lineStrokeWidth);
    	line.setAttribute('x1', yAxisLeftPadding);
    	line.setAttribute('y1', pixelIntercept);
    	line.setAttribute('x2', pixelxMax);
    	line.setAttribute('y2', y2);
    	
    	currCoordSlope      	= pixels2Slope(pixelSlope);
    	currPixelCoordSlope 	= pixelSlope;
    	currCoordIntercept      = pixels2Intercept(pixelIntercept);
    	currPixelCoordIntercept = pixelIntercept;
    	
    	return line;
    }

    //------------------------------  Transform Utils -------------------------

    var pixelsPt2Coord = function(pixelX, pixelY) {
    	/**
    	 * Given pixel values for a point, return an 
    	 * object where x = x-in-coord-system, and 
    	 * y = y-in-coord-system.
    	 */
    	var coordX = (pixelX - yAxisLeftPadding) / gridSize;
    	var coordY = (yAxisHeight - pixelY) / gridSize;
    	return {'x' : coordX, 'y' : coordY};
    }
    
    var coordPt2Pixels = function(coordX, coordY) {
    	/**
    	 * Given coordinate system values for a point, return an 
    	 * object where x = x-in-pixels, and 
    	 * y = y-in-pixels.
    	 */
    	// The following min/max guard against 
    	// points being outside the visible range:
    	var pixelsX = Math.min(coordX * gridSize + yAxisLeftPadding, xAxisWidth);
    	var pixelsY = Math.max(yAxisHeight - (coordY * gridSize), 0);
    	// Keep points about the x axis:
    	if (pixelsY > yAxisHeight) {
    		pixelsY = yAxisHeight;
    	}
    	
    	return {'x' : pixelsX, 'y' : pixelsY};
    }
    
    var intercept2Pixels = function(intercept) {
    	return yAxisHeight - (gridSize * intercept);
    }
    
    var pixels2Intercept = function(pixelIntercept) {
    	return (yAxisHeight - pixelIntercept) / gridSize;
    }
    
    var slope2Pixels = function(slope) {
    	return - slope;
    }
    
    var pixels2Slope = function(pixelSlope) {
    	return - pixelSlope;
    }

    //------------------------------  Creating Visual Elements -------------------------
    
	var makeCoordSys = function() {

		var coordFld = document.createElementNS(NS,"svg");
		coordFld.width  = coordSys.width;
		coordFld.height = coordSys.height;
		
    	// Draw vertical grid lines:
		for (var x = yAxisLeftPadding; x < coordSys.width; x += gridSize) {
			var gridLine = document.createElementNS(NS, 'line');
			gridLine.x1.baseVal.value = x;
			gridLine.y1.baseVal.value = 0.5;
			gridLine.x2.baseVal.value = x;
			gridLine.y2.baseVal.value = coordSys.height;
			gridLine.setAttribute('stroke', "black");
			gridLine.setAttribute('stroke-opacity', gridLineOpacity);
			gridLine.setAttribute('stroke-width', gridLineWidth);
			coordFld.appendChild(gridLine);
		}
		
		// Draw horizontal grid lines:
		for (var y = 0.5; y < coordSys.height; y += gridSize) {
			var gridLine = document.createElementNS(NS, 'line');
			gridLine.x1.baseVal.value = yAxisLeftPadding;
			gridLine.y1.baseVal.value = y;
			gridLine.x2.baseVal.value = coordSys.width
			gridLine.y2.baseVal.value = y;
			gridLine.setAttribute('stroke', "black");
			gridLine.setAttribute('stroke-opacity', gridLineOpacity);
			gridLine.setAttribute('stroke-width', gridLineWidth);
			coordFld.appendChild(gridLine);
		}
		
		// Draw y axis: (Shortened by 1/2 grid size)
		var yAxis = makeArrow(yAxisLeftPadding, yAxisHeight-halfGridS,
			    		      yAxisLeftPadding, gridSize,
				    	      axisStrokeWidth,
				    	      axisStrokeOpacity);
		coordFld.appendChild(yAxis);
		
		// Draw x axis: (raised by 1/2 grid size)
		var xAxis = makeArrow(yAxisLeftPadding - axisStrokeWidth/2, yAxisHeight-halfGridS,
							  xAxisWidth, yAxisHeight-halfGridS,
					          axisStrokeWidth,
					          axisStrokeOpacity);
		coordFld.appendChild(xAxis);
		
		// Draw x axis label:
		var xLabel = document.createElementNS(NS, 'text');
		xLabel.setAttribute('id', 'xLabel');
		xLabel.textContent = xAxisLabel;
		// Get text width:
		xLabel.setAttribute('x', xAxisWidth);
		// Make the label *end* at x:
		xLabel.setAttribute('text-anchor', 'end');
		xLabel.setAttribute('y', yAxisHeight);
		xLabel.setAttribute('fill', '#000');
		
		coordFld.appendChild(xLabel);
		
		// Draw y axis label
		var yLabel = document.createElementNS(NS, 'text');
		yLabel.setAttribute('id', 'yLabel');
		yLabel.textContent = yAxisLabel;
		var labelHeight = 56;
		var labelWidth  = 100;
		
		yLabel.setAttribute('fill', '#000');

		coordFld.appendChild(yLabel);
		
		return coordFld;
	}
	
	var makeLineDragHandle = function() {
		var handle = document.createElementNS(NS, 'rect');
		handle.setAttribute('id', 'lineDragHandle');
		handle.setAttribute('x', yAxisLeftPadding - Math.round(lineDragHandleWidth / 2));
		handle.setAttribute('y', currPixelCoordIntercept - Math.round(lineDragHandleHeight / 2.0));
		handle.setAttribute('width', lineDragHandleWidth);
		handle.setAttribute('height', lineDragHandleHeight);
		handle.setAttribute('fill', lineDragHandleRestColor);
		handle.setAttribute('stroke', 'black');
		return handle;
	}

	var makeRotateHandle = function() {
		var handle = document.createElementNS(NS, 'rect');
		handle.setAttribute('id', 'rotateHandle');
		
		var handlePos = computeRotHandlePixelCoords();
		handle.setAttribute('x', handlePos.x - Math.round(rotateHandleWidth / 2));
		handle.setAttribute('y', handlePos.y - Math.round(lineDragHandleHeight / 2.0));
		handle.setAttribute('width',  rotateHandleWidth);
		handle.setAttribute('height', rotateHandleHeight);
		handle.setAttribute('fill',   rotateHandleRestColor);
		handle.setAttribute('stroke', 'black');
		return handle;
	}
	
	var placeDataPoints = function(ptCoordArray) {
		/**
		 * Given an array of {'x' : <num>, 'y' : <num>, 'id' : <id>,  'title' : <tooltip>},
		 * draw those points if they don't exist, or move them
		 * if they do exist. Units are user level coord system.
		 */
		var errLine;
		var ptCircle;
		var errMagTxt;
		var arrLen = ptCoordArray.length;
		for (var i=0; i<arrLen;  i++) {
			
			var ptSpec = ptCoordArray[i];
			// Does datapoint already exist?:
			var ptErrLineGrp = document.getElementById(ptSpec.id);
			if (ptErrLineGrp === null) {
				// No: create the point/errLine group:
				var ptErrLineGrp = document.createElementNS(NS, 'g');
				ptErrLineGrp.setAttribute('id', ptSpec.id);
				// Add a tooltip to the circle (i.e. the measurement):
				ptErrLineGrp.title = ptSpec.title;
				
				// Make the circle of the data point:
				ptCircle =  document.createElementNS(NS, 'circle');
				
				// Create an error line to go with the point:
				errLine = document.createElementNS(NS, 'line');
				errLine.setAttribute('stroke', 'red');
				errLine.setAttribute('stroke-width', 3);
				
				// Make an error number text element for the
				// data point. Its position will be set later in
				// this method:
				errMagTxt = document.createElementNS(NS, 'text');
				errMagTxt.setAttribute('fill', 'red');
				errMagTxt.textContent = '000';				

				// Add circle and error line to the group,
				// putting the err line first to be under
				// the circle:
				
				ptErrLineGrp.appendChild(errLine);
				ptErrLineGrp.appendChild(errMagTxt);
				ptErrLineGrp.appendChild(ptCircle);
				
				// Show the point:
				svgArea.appendChild(ptErrLineGrp);
				dataPtObjArr.push(ptErrLineGrp);
			}
			
			// Style and position the circle:
			ptCircle = ptObjCircle(ptErrLineGrp);
			var pixelPt = coordPt2Pixels(ptSpec.x, ptSpec.y);
			ptCircle.setAttribute('cx', pixelPt.x);
			ptCircle.setAttribute('cy', pixelPt.y);
			ptCircle.setAttribute('r', dataPtRadius);
			ptCircle.setAttribute('fill', dataPtFill);
			ptCircle.setAttribute('stroke', dataPtStroke);
			
			// Style and position the error line:
			errLine = ptObjErrLine(ptErrLineGrp);
			errLine.x1.baseVal.value = ptCircle.cx.baseVal.value;
			errLine.y1.baseVal.value = ptCircle.cy.baseVal.value;
			errLine.x2.baseVal.value = ptCircle.cx.baseVal.value;
			errLine.y2.baseVal.value = ptCircle.cy.baseVal.value; // end pt on top of start pt.
			errLine.style.color = 'red';
			errLine.style.strokeWidth = errLineStrokeWidth;
			
			// Style and position the error magnitude text element
			// to the left of the error line:
			errMagTxt    = ptObjMagTxt(ptErrLineGrp);
			// Length of err line:
			var magnitude    = errLine.y2.baseVal.value - errLine.y1.baseVal.value;
			// String version of magnitude with one decimal point:
			var magnitudeStr = magnitude.toFixed(1).toString();
			var magStrPixelWidth = pixelsInEm(errMagTxt) * magnitudeStr.length;
			errMagTxt.setAttribute('x', errLine.x1.baseVal.value - magStrPixelWidth - errMagPadding);
			// Want text half-way down the error line:
			var errMagStrYPos =  errLine.y1.baseVal.value + Math.round(magnitude / 2);
			errMagTxt.setAttribute('y', errMagStrYPos);
			errMagTxt.textContent = magnitude.toString();
			
		}
		if (currPixelCoordSlope !== undefined && currPixelCoordIntercept !== undefined) {
			adjustErrorLines(currPixelCoordSlope, currPixelCoordIntercept);
			adjustErrFormulas();			
		}
	}
	
	var makeArrow = function(x1, y1, x2, y2, strokeWidth, strokeOpacity) {
		if (strokeWidth === undefined || strokeWidth === null) {
			strokeWidth = arrowDefaultWidth;
		}
		if (strokeOpacity === undefined || strokeOpacity=== null) {
			strokeOpacity = 1;
		}
		
		var arrow = document.createElementNS(NS, 'line');
		arrow.x1.baseVal.value = x1;
		arrow.y1.baseVal.value = y1;
		arrow.x2.baseVal.value = x2;
		arrow.y2.baseVal.value = y2;
		arrow.setAttribute('stroke', arrowDefaultColor);
		arrow.setAttribute('stroke-width', strokeWidth);
		arrow.setAttribute('stroke-opacity', axisStrokeOpacity);
		setArrowheadOpacity(strokeOpacity);
		arrow.setAttribute('marker-end', 'url(#arrowHead)');
		return arrow;
	}
	
	var createArrowHead = function() {
	    var arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

	    arrowHead.style.width = "200px";
	    arrowHead.style.height = "200px";
	    arrowHead.style.overflow = 'visible';
	    arrowHead.style.position = 'absolute';
	    arrowHead.setAttribute('version', '1.1');
	    arrowHead.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	    //****div.appendChild(svgNode);

	    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
	    var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
	    marker.setAttribute('id', 'arrowHead');
	    marker.setAttribute('viewBox', '0 0 10 10');
	    marker.setAttribute('refX', '0');
	    marker.setAttribute('refY', '5');
	    marker.setAttribute('markerUnits', 'strokeWidth');
	    marker.setAttribute('markerWidth', '4');
	    marker.setAttribute('markerHeight', '3');
	    marker.setAttribute('orient', 'auto');
	    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	    path.setAttribute('id', 'arrowHeadPath');
	    marker.appendChild(path);
	    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');

   	    arrowHead.appendChild(defs);
	    defs.appendChild(marker);
	    
	    return arrowHead; 
	}
	
	var setArrowheadOpacity = function(opacity) {
		arrHeadPath = document.getElementById('arrowHeadPath')
	    arrHeadPath.setAttribute('opacity', opacity);

	}
	
	var ptObjCircle = function(dataPtGrp) {
		return dataPtGrp.children[2];
	}
	
	var ptObjErrLine= function(dataPtGrp) {
		return dataPtGrp.children[0];
	}

	var ptObjMagTxt = function(dataPtGrp) {
		return dataPtGrp.children[1];
	}

	
	var pixelsInEm = function(parentElement) {
		/**
		 * Given an optional parent element, return the width
		 * of one em in pixels. If parentElement is not provided,
		 * uses document.body.
		 */
		parentElement = parentElement || document.body;
		return Number(getComputedStyle(parentElement, "").fontSize.match(/(\d*(\.\d*)?)px/)[1]);		
	}
	
	var computeRotHandlePixelCoords = function() {
		/**
		 * Find the right-most visible point on the line.
		 */
		var x = Math.min(xAxisWidth, Math.round(-currPixelCoordIntercept / currPixelCoordSlope));
		var y = currPixelCoordSlope * x + currPixelCoordIntercept;
		return {'x' : x, 'y' : y};
	}
	
	
	/*------------------------------- Error equation creation/updates ------------- */

	var adjustErrorLines = function(pixelSlope, pixelIntercept) {
		for (var i=0; i<dataPtObjArr.length; i++) {
			// Get one group: circle/errLine:
			var dataObj = dataPtObjArr[i];
			// Get the data point's circle, error line, 
			// and err magnitude txt element:
			var dataCircle = ptObjCircle(dataObj);
			var errLine    = ptObjErrLine(dataObj);
			var errMagTxt  = ptObjMagTxt(dataObj);
			
			var pixelX  = dataCircle.cx.baseVal.value;
			var pixelY  = dataCircle.cy.baseVal.value;
			var lineY   = solveEquation(pixelX);
			var errorLen = lineY - pixelY + Math.round(dataPtRadius / 2);
			
			// Set the error line length, taking account
			// of the line starting in the middle of the
			// data point circle, and ending in the middle
			// of the line:
			//****var correction = Math.round(lineStrokeWidth / 2) + Math.round(dataPtRadius/2); 
			//****var correction = Math.round(dataPtRadius/2);
			var correction = 0;
			errLine.setAttribute('y2', lineY + correction);
			
			// Convert the pixel error magnitude to 
			// coord sys:
			var errorLenCoord = (errorLen / gridSize).toFixed(1);
			// Set the error magnitude text:
			errMagTxt.textContent = errorLenCoord;
			// Set (or initially add) the error magnitude to
			// the point object group:
			dataObj.setAttribute('errMagnitude', errorLenCoord);
		}
	}
	
	var adjustErrFormulaResultsOnly = function() {
		// Compute the estimators (MAE, MSE, RMSE):
		var estimators = computeErrorEstimators();
		document.getElementById('maeTotalSumCell').innerHTML = estimators.mae;
		document.getElementById('mseTotalSumCell').innerHTML = estimators.mse;
		document.getElementById('rmseTotalSumCell').innerHTML = estimators.rmse;
		
		// The equation:
		document.getElementById('currEquation').innerHTML = 'potatoes = ' + 
															currCoordSlope.toFixed(2) + 
															' * distance + ' + 
															currCoordIntercept.toFixed(2);
		
		
	}
	
	var adjustErrFormulas = function() {
		/**
		 * Gets the error residual magnitudes, and 
		 * updates the formulas on the screen. Both
		 * the error sums and the current formula.
		 */
		
		var maeSumCell  = document.getElementById('maeSumCell'); 
		var mseSumCell  = document.getElementById('mseSumCell'); 
		var rmseSumCell = document.getElementById('rmseSumCell'); 
		
		var maeFormulaStr  = '{{';
		var mseFormulaStr  = '{{';
		var rmseFormulaStr = '\\sqrt{{';
		
		// Accumulate the sum term strings, treating the first term
		// separately, b/c of the plus signs between the remaining
		// terms:
		
		var firstErr = dataPtObjArr[0].getAttribute('errMagnitude');
		if (firstErr < 0) {
			maeFormulaStr  += '|' + firstErr + '|';
			mseFormulaStr  += '(' + firstErr + ')^2';
			rmseFormulaStr += '(' + firstErr + ')^2';
		} else {
			maeFormulaStr   += firstErr;
			mseFormulaStr   += firstErr + '^2';
			rmseFormulaStr  += firstErr + '^2';
		}
		
		// Build the sum of terms part for the remaining terms:
		var errorEstimators = computeErrorEstimators();
		
		for (var i=1; i<dataPtObjArr.length; i++) {
			dataPtObj = dataPtObjArr[i];
			nxtError = dataPtObj.getAttribute('errMagnitude');
			if (i != 0) {
				if (nxtError > 0) {
					maeFormulaStr  += ' + ' + nxtError;
					mseFormulaStr  += ' + ' + nxtError + '^2';
					rmseFormulaStr += ' + ' + nxtError + '^2';
				} else {
					maeFormulaStr  += ' + |' + nxtError + '|';
					mseFormulaStr  += ' + ' + '(-' + Math.abs(nxtError) + ')' + '^2';
					rmseFormulaStr += ' + ' + '(-' + Math.abs(nxtError) + ')' + '^2';
				}
			}
		}
		
		// Now have e1 + e2 +...
		// Next: the division by the number of data points:
		maeFormulaStr  += '} \\over ' + dataPtObjArr.length + '}';
		mseFormulaStr  += '} \\over ' + dataPtObjArr.length + '}';
		rmseFormulaStr += '} \\over ' + dataPtObjArr.length + '}';		

		// Compute the estimators (MAE, MSE, RMSE):
		var estimators = computeErrorEstimators();
		
		// Stick the sum terms into their table cells:
		var maeSumsMath = MathJax.Hub.getAllJax("maeSumCell")
		
		// If no math was found, we are calling this method for
		// the first time. In that case, init the innerHTML.
		// That will trigger the MathJax re-typesetting:
		
		if (maeSumsMath.length == 0) {
			// The sum terms:
			maeSumCell.innerHTML  = '$' + maeFormulaStr + '$';
			mseSumCell.innerHTML  = '$' + mseFormulaStr + '$';
			rmseSumCell.innerHTML = '$' + rmseFormulaStr + '$';
		} else {
			// Ask MathJax to replace the sums terms:
			maeSumsMath = maeSumsMath[0];
			MathJax.Hub.Queue(["Text",maeSumsMath,maeFormulaStr]);
			// MSE sums:
			var mseSumsMath = MathJax.Hub.getAllJax("mseSumCell")[0]
			MathJax.Hub.Queue(["Text",mseSumsMath,mseFormulaStr]);
			// RMSE sums:
			var rmseSumsMath = MathJax.Hub.getAllJax("rmseSumCell")[0]
			MathJax.Hub.Queue(["Text",rmseSumsMath,rmseFormulaStr]);
		}
		
		// The final estimator result:
		document.getElementById('maeTotalSumCell').innerHTML  = estimators.mae;
		document.getElementById('mseTotalSumCell').innerHTML  = estimators.mse;
		document.getElementById('rmseTotalSumCell').innerHTML = estimators.rmse;
		
		// The 'current formula' is just normal HTML:
		// The equation:
		document.getElementById('currEquation').innerHTML = 'potatoes = ' + 
															currCoordSlope.toFixed(2) + 
															' * distance + ' + 
															currCoordIntercept.toFixed(2);
	}
	
	/*------------------------------- Number Crunching ------------- */

	
	
	var solveEquation = function(pixelX) {
		//****return currPixelCoordSlope * pixelX + currPixelCoordIntercept;
		return currPixelCoordSlope * (pixelX - yAxisLeftPadding) + currPixelCoordIntercept;
	}
	
	var computeErrorEstimators = function() {
		/**
		 * Goes through all the data points, expecting that
		 * they hold an attribute 'errMagnitude' with the error
		 * amount in coordinate system units. Populates class
		 * variables MAE, MSE, and RMSE.
		 * 
		 * In addition, returns an object with properties
		 * 'mae', 'mse', and 'rmse'.
		 */
		
		var errSum = 0.0;
		var errSquaredSum = 0.0;
		var nxtError;
		for (var i=0; i<dataPtObjArr.length; i++) {
			var dataPtObj = dataPtObjArr[i];
			nxtError = dataPtObj.getAttribute('errMagnitude');
			// The Math.abs is for MAE: it's the sum of the 
			// absolute errors:
			errSum += parseFloat(Math.abs(nxtError));
			errSquaredSum += Math.pow(parseFloat(nxtError),2.0);
		}
		var numDataPts = dataPtObjArr.length;
		var MAE  = (errSum/numDataPts).toFixed(1);
		// Don't fix MSE to 1 decimal pt until
		// it was used to compute the RMSE:
		var MSE  = errSquaredSum/numDataPts;
		var RMSE = Math.sqrt(MSE).toFixed(1);
		// Reduce MSE to one decimal point:
		var MSE  = MSE.toFixed(1);
		return({'mae' : MAE, 'mse' : MSE, 'rmse' : RMSE});
	}
	
	var findMinima = function() {
		
		/**
		 * Creates array containing objects with fields:
		 *      'm', 'b', 'mae', 'mse', 'rmse'.
		 *
		 * Returns:
		 *     {
 	     *      'minMae'  : minMae,
		 *  	'minMse'  : minMse,
		 *  	'minRmse' : minRmse,
		 *  	'resMatrix' : resMatrix
		 *     }
		 *     
		 *  where 'resMatrix is the array of objects as per above.
		 *  The array is sorted by m, then b.
		 */
		
		
		var resMatrix = [];

		// Currently minimal measures:
		var minMae   = maxCoordSysY;
		var minMse   = maxCoordSysY;
		var minRmse  = maxCoordSysY;
		
		// Errors for each point:
		var maeErrs  = [];
		var mseErrs  = [];
		
		var finalMae;
		var finalMse;
		var finalRmse;
		
		for (var m=0; m<maxCoordSysX; m+=meshStep) {
			for (var b=0; b<maxCoordSysY; b+=meshStep) {
				// Compute errors for all points with new m and b:
				maeErrs = [];
				mseErrs = [];
				// For each measured point, compute the error and square of error wrt mx+b,
				// all in terms of coord units:
				for (var ptObjNum=0; ptObjNum<dataPtObjArr.length; ptObjNum++) {
					// Compute the error estimators for this point
					// for the current mx + b:
					var ptXPixels   = ptObjCircle(dataPtObjArr[ptObjNum]).getAttribute('cx');
					var ptYPixels   = ptObjCircle(dataPtObjArr[ptObjNum]).getAttribute('cy');
					var coordXY = pixelsPt2Coord(ptXPixels, ptYPixels);
					var ptX = coordXY.x;
					var ptY = coordXY.y;
					var lineY = m * ptX + b;
					var err = Math.abs(ptY - lineY);
					maeErrs.push(err);
					var mseErr = err * err;
					mseErrs.push(mseErr);
				}
				// Collected the errors for this m/b combination.
				// compute the final estimators.
				
				// MAE is sum of errors divided by number of points:
				var finalMae = maeErrs.reduce(function(prevVal, currVal, index, array) {
					return prevVal + currVal;
				}) / dataPtObjArr.length;

				// MSE and RMSE both need sum of squares divided by num of points.
				// The mseErrs are already squared, so just add them up:
				var finalMse = mseErrs.reduce(function(prevVal, currVal, index, array) {
					return prevVal + currVal;
				}) / dataPtObjArr.length;
				
				var finalRmse = Math.sqrt(finalMse);
				
				// Found a new minimum in any of the estimators?
				minMae  = Math.min(minMae, Math.abs(finalMae));
				minMse  = Math.min(minMse, finalMse);
				minRmse = Math.min(minRmse, finalRmse);
				
				// Add this round's m,b,mae,mse,rmse object to the resMatrix:
				resMatrix.push({'m' : m, 'b' : b, 'mae' : finalMae, 'mse' : finalMse, 'rmse' : finalRmse});
			}
		}
		return {'minMae'  : minMae,
				'minMse'  : minMse,
				'minRmse' : minRmse,
				'resMatrix' : resMatrix
				};
	}
		
	var mbForMinMae = function() {
		/**
		 * Return {'m' : <slope>, 'b' : <intercept>} that 
		 * minimize the MAE. We assume that computeErrorEstimators()
		 * was already called, and that instance var resMatrix 
		 * contains an array of:
		 *    {'m' : m, 'b' : b, 'mae' : <mae>, 'mse' : <mse>, 'rmse' : <rmse>}
		 *    
		 * and that instance var minMae contains the minimum.
		 */

		if (theMBForMinMae === null) {
			for (var i=0; i<resMatrix.length; i++) {
				if (resMatrix[i].mae == minMae) {
					var resEntry = resMatrix[i]; 
					theMBForMinMae = {'m' : resEntry.m, 'b' : resEntry.b};
					return theMBForMinMae;
				}
			}
		} else{
			return theMBForMinMae;
		}

	}

	var mbForMinMse = function() {
		/**
		 * Return {'m' : <slope>, 'b' : <intercept>} that 
		 * minimize the MSE. We assume that computeErrorEstimators()
		 * was already called, and that instance var resMatrix 
		 * contains an array of:
		 *    {'m' : m, 'b' : b, 'mae' : <mae>, 'mse' : <mse>, 'rmse' : <rmse>}
		 *    
		 * and that instance var minMse contains the minimum. Returned
		 * units are in pixels.
		 */

		if (theMBForMinMse === null) {
			for (var i=0; i<resMatrix.length; i++) {
				if (resMatrix[i].mse == minMse) {
					var resEntry = resMatrix[i];
					theMBForMinMse = {'m' : resEntry.m, 'b' : resEntry.b};
					return theMBForMinMse;
				}
			}
		} else {
			return theMBForMinMse;
		}
	}

	var mbForMinRmse = function() {
		/**
		 * Return {'m' : <slope>, 'b' : <intercept>} that 
		 * minimize the RMSE. We assume that computeErrorEstimators()
		 * was already called, and that instance var resMatrix 
		 * contains an array of:
		 *    {'m' : m, 'b' : b, 'mae' : <mae>, 'mse' : <mse>, 'rmse' : <rmse>}
		 *    
		 * and that instance var minRmse contains the minimum.
		 */

		if (theMBForMinRmse === null) {
			for (var i=0; i<resMatrix.length; i++) {
				if (resMatrix[i].rmse == minRmse) {
					var resEntry = resMatrix[i];
					theMBForMinRmse = {'m' : resEntry.m, 'b' : resEntry.b};;
					return theMBForMinRmse;
				}
			}
		} else {
			return theMBForMinRmse;
		}

	}

	//******
	//var minimaForMB = function(m, b) {
	this.minimaForMB = function(m, b) {
		//******
		/**
		 * Given a slope and intercept, return:
		 *    {'mae' : <mae>, 'mse' : <mse>, 'rmse' : <rmse>}
		 * We assume that computeErrorEstimators()
		 * was already called, and that instance var resMatrix 
		 * contains an array of:
		 *    {'m' : m, 'b' : b, 'mae' : <mae>, 'mse' : <mse>, 'rmse' : <rmse>}
		 *    
		 * The array is sorted by m, then by b, and both increment
		 * in steps of meshStep.
		 */
		m = fixFloat(1);
		b = fixFloat(1);
		var mIndx = Math.round(m / meshStep);
		var bIndx = Math.round(b / meshStep);
		var meshEntry  = resMatrix[mIndx + bIndx];
		return {'mae'  : meshEntry.mae,
			'mse'  : meshEntry.mse,
			'rmse' : meshEntry.rmse
		};
	}

	// ---------------------------- 3D Charting -------------------

	this.setupSurfaceChart = function(options) {
		/**
		 * Create the 3D surface with given (optional) options.
		 * Currently options "highlights" and "axisLabelPos" are supported.
		 * Highlight points are points in the 3D surface that are
		 * to be set off from their immediate environment, either by
		 * color contrast, or by stroke width.
		 * 
		 * The option argument is an array of objects, or
		 * a single object of the following format:
		 *  
		 *     {'highlights'   : [{"x" : row,
		 *     	                   "y" : column,
		 *     	                   "method" : <highlight-method>}
		 *                            ...
		 *                       ],
		 *      'axisLabelPos'  : <axisPos>
		 *     }
		 *     
		 * where <highlight-method> is either "stroke" or "color",
		 * and axisPos is "middle" or "top".
		 */
		
		//*******
		options = {'highlights' : [{'x' : 2,
									'y' : 3,
									'method' : 'color'}]};
		
		//*******
		
		var scaleFactor = 1.0/1000.0;
		var numRows = 50.0;
		var numCols = 50.0;
		var axisLabelPos = null;
		var highlights   = null;
		
		if (options !== undefined) {
			axisLabelPos = options['axisLabelPos'] || null;
			highlights   = options['highlights'] || null;
		}
		
		// Make highlights quicker to check for in the 
		// loop below: JS arrays are sparse, so can 
		// set, e.g. arr[10] = 40, and not use space for arr[0...9].
		// So build a table highlightsTable[i] <-- [{'j' : point1_J, 'method' : 'color'},
		//											{'j' : point2_J, 'method' : 'stroke'},
		//                                                 ...
		//                                         ]
		
		highlightsTable = [];
		if (highlights !== null) {
			for (var h=0; h<highlights.length; h++) {
				
				var highlight = highlights[h];
				var pt_i      = highlight.i;
				var pt_j      = highlight.j;
				var method    = highlight.method;
				if (highlightsTable[pt_i] !== undefined) {
					highlightsTable[pt_i].push({'j' : pt_j, 'method' : highlight.method});
				} else {
					highlightsTable[pt_i] = [{'j' : pt_j, 'method' : highlight.method}];
				}
			}
		}
		
		var tooltipStrings = new Array();
		var data = new google.visualization.DataTable();

		for (var i = 0; i < numCols; i++) {
			data.addColumn('number', 'col'+i);
		}

		data.addRows(numRows);
		
		data.setTableProperty('highlights', highlights)
		
		var idx = 0;

		for (var i = 0; i < numRows; i++) {
			for (var j = 0; j < numCols; j++) {
				var matrixEntry = resMatrix[numRows * i + j];
				var value = matrixEntry.mse;
				//****************
				data.setValue(i, j, value * scaleFactor);
/*				if (matrixEntry.m == currCoordSlope &&
					matrixEntry.b == currCoordIntercept) {
					data.setValue(i,j, 10 * value / 1000.0);
				} else {
						data.setValue(i, j, value / 1000.0);
				}
*/				//****************
				
				// Should this value be highlighted in the 3d plot? 
				if (highlightsTable[i] !== undefined) {
					// Get the j's for which point(i,j) is to be highlighted:
					var jObjArrForThisI = highlightsTable[i];
					for (var jIndx in jObjArrForThisI) {
						var jHighlightInfo = jObjArrForThisI[jIndx];  
						if (jHighlightInfo.j == j) {
							data.setProperty(i, j, "highlight", jHighlightInfo.method);
						}
					}
					
				} 

				tooltipStrings[idx] = "slope:" + matrixEntry.m.toFixed(2) + ", intercept:" + matrixEntry.b.toFixed(2) + ": error = " + value.toFixed(2);
				idx++;
			}
		}
/*		//********
		for (var i = 0; i < numRows; i++) {
			for (var j = 0; j < numCols; j++) {
				console.log(i + ',' + j + ': ' + data.getValue(i,j))
			}
		}
*/		//********		
		
		var surfacePlot = new greg.ross.visualisation.SurfacePlot(document.getElementById("surfacePlotDiv"));

		// Don't fill polygons in IE. It's too slow.
		var fillPly = true;

		// Define a colour gradient.
		var colour1 = {red:0, green:0, blue:255};
		var colour2 = {red:0, green:255, blue:255};
		var colour3 = {red:0, green:255, blue:0};
		var colour4 = {red:255, green:255, blue:0};
		var colour5 = {red:255, green:0, blue:0};
		var colours = [colour1, colour2, colour3, colour4, colour5];

		// Axis labels.
		var xAxisHeader = "Slope";
		var yAxisHeader = "Intercept";
		var zAxisHeader = "Mean squared error";

		var options = {xPos: 300, yPos: 50, width: 900, height: 500, colourGradient: colours,
				fillPolygons: fillPly, tooltips: tooltipStrings, xTitle: xAxisHeader,
				yTitle: yAxisHeader, zTitle: zAxisHeader, restrictXRotation: false};

		surfacePlot.draw(data, options);
	}

	// ---------------------------- Utilities  -------------------
	
	var saveState = function() {
		/**
		 * Save position of line-drag and rotate handles.
		 * Save current slope and intercept. No quantities are
		 * changed. This method's dual is restoreState() which 
		 * moves line and handles to their previous positions.
		 */
		
		savedState.pixelSlope           = currPixelCoordSlope;
		savedState.pixelIntercept       = currPixelCoordIntercept;
		savedState.pixelLineDragHandleY = lineDragHandle.getAttribute('y');
		savedState.pixelRotateHandleY   = rotateHandle.getAttribute('y');
	}
	
	var restoreState = function() {
		currPixelCoordIntercept = savedState.pixelIntercept;
		currPixelCoordSlope     = savedState.pixelSlope;
		drawFuncLineGivenPixelDims(savedState.pixelSlope, savedState.pixelIntercept, xAxisWidth);
		moveLineDragHandlePixels(savedState.pixelLineDragHandleY);
		moveRotateHandlePixels(savedState.pixelRotateHandleY);
		// Error computation must come before formula update:
		adjustErrorLines(currPixelCoordSlope, currPixelCoordIntercept);
		//****adjustErrFormulaResultsOnly();
		adjustErrFormulas();
	}
}

regSim = new RegressionSim();
regSim.setup();

// Create 3D chart:
google.load("visualization", "1");
google.setOnLoadCallback(regSim.setupSurfaceChart);

document.getElementById('lineDragHandle').addEventListener('mousedown', regSim.lineMoveHandleMouseDown);
document.getElementById('lineDragHandle').addEventListener('mouseup'  , regSim.lineMoveHandleMouseUp);
document.getElementById('rotateHandle').addEventListener('mousedown', regSim.rotateHandleMouseDown);
document.getElementById('rotateHandle').addEventListener('mouseup'  , regSim.rotateHandleMouseUp);

document.getElementById('seeMaeButton').addEventListener('mousedown'  , regSim.seeBestMaeButtonMouseDown);
document.getElementById('seeMaeButton').addEventListener('mouseup'  , regSim.seeBestButtonMouseUp);

document.getElementById('seeMseButton').addEventListener('mousedown'  , regSim.seeBestMseButtonMouseDown);
document.getElementById('seeMseButton').addEventListener('mouseup'  , regSim.seeBestButtonMouseUp);

document.getElementById('seeRmseButton').addEventListener('mousedown'  , regSim.seeBestRmseButtonMouseDown);
document.getElementById('seeRmseButton').addEventListener('mouseup'  , regSim.seeBestButtonMouseUp);




//*****  Show mouse coordinates instead of x axis label:
document.getElementById('regressionBody').addEventListener('mousemove', function(evt) {
	var xLabel = document.getElementById('xLabel');
	var coordX = (evt.clientX - regSim.yAxisLeftPadding) / regSim.gridSize;
	var coordY = (regSim.yAxisHeight - evt.clientY) / regSim.gridSize;
	
	var coordStr = 'coordx: ' + coordX + ', coordy:' + coordY + '; x: ' + evt.clientX + ', y:' + evt.clientY;  
	xLabel.innerHTML = coordStr;
});

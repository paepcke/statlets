CorrelationViewer = function() {
	
	var chart  = null;
	var p1Name = null;
	var p2Name = null;
	
	var constructor = function() {
		
		p1Name = document.getElementById('person1Name').innerHTML;
		p2Name = document.getElementById('person2Name').innerHTML;
		
		update();
		
		return{
			update : update,
		};
	}
	
	var update = function() {
		/*
		 * Read latest dollar amounts from the table,
		 * update the chart, and re-compute Pearson's r
		 */
		let inTbl = document.getElementById('inputTbl');

		// Person1's data, which starts after the 
		// person name in col 1 of row 1 (row 0 is the
		// header):

		let person1Data = getRowData('inputTbl', 1, 1);
		let person2Data = getRowData('inputTbl', 2, 1); // Person2's data

		// Turn the header row's cells from an HTML collection
		// into an array:
		
		cellArr = getCellData(inTbl.rows[0]);
		
		// From the table, take the header row. Grab each of the
		// column (a.k.a. cells), and get their text via the map() below.
		// Then skip the first header cell, which is 'Spender':
		
		let xCategories = cellArr.map(function(cell) {return cell.innerHTML}).splice(1);
		

		if (chart === null) {
			chart = c3.generate({
				bindto : '#chart',
				data   : {
					columns : [
					           person1Data,
					           person2Data
					           ],
					           type : 'scatter',
				},
				axis   : {
					x  : {
						label : {
							text     : 'Month',
							position : 'middle'
						},
						type       : 'category',
						categories : xCategories,
					},
					y  : {
						label : {
							text      : 'Expenditures',
							position  : 'middle',
						}
					}
				}
			});
		} else {
			chart.load( {columns : [
			                        [p1Name].concat(person1Data),
			                        [p2Name].concat(person2Data)
			                        ]
			});
		}
	}
	
	var getCellData = function(rowObj, startCol) {
		return [].slice.call(rowObj.cells)
	}
	
	var getRowData = function(tableId, rowNum, startCol, contentValidateFunc) {
		
		let rowVals = [];
		
		let tblObj = document.getElementById(tableId);
		if (tblObj === null) {
			throw `Table object ${tableId} unknown.`;
		}

		let rows = tblObj.rows;
		
		if (rowNum > rows.length - 1) {
			throw `Table ${tableId} only has ${rows.length} columns; column ${rowNum} was requested.`
		}
		
		if (typeof(startCol) === 'undefined') {
			startCol = 0;
		} else {
			if (typeof(startCol) !== 'number') {
				throw `If startCol is provided, it must be an integer; but is ${startCol}`
			}
		}
		
		let row = rows[rowNum]
		
		if (startCol > row.cells.length) {
			throw `Row ${rowNum} of table ${tableId} has ${row.cells.length} cells, but start cell ${startCol} was requested.`
		}
		
		for (let col of getCellData(row)) {
			let val = col.innerHTML;
			if (typeof(contentValidateFunc) !== 'undefined') {
				if (! contentValidateFunc(val)) {
					val = 'n/a';
				}
			}
			rowVals.push(val);
		}
		return rowVals;
	}
	
	return constructor();
}

CorrelationViewer()

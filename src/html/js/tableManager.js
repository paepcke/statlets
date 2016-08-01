TableManager = function(headerArr, dataArr) {
	
	var headerArr = headerArr;
	var dataArr   = dataArr;
	var tableEl   = null;
	
	var constructor = function() {
		tableEl = document.createElement('TABLE');
		
		let headerRow = tableEl.insertRow(0);

		for (let headerColIndx in headerArr) {
			let cell = headerRow.insertCell(headerColIndx);
			cell.innerHTML = headerArr[headerColIndx];
		}
		for (let dataIndx in dataArr) {
			
			let intDataIndx = parseInt(dataIndx);
			let row  = tableEl.insertRow(intDataIndx + 1);  // +1: account for header row.
			let data = dataArr[intDataIndx];
			
			for (let dataItemIndx in data) {
				let intDataItemIndx = parseInt(dataItemIndx); 
				let cell = row.insertCell(intDataItemIndx);
				cell.innerHTML = data[intDataItemIndx];
			}
		}
		
		return {getRow  : getRow,
				getCell : getCell,
				setCell : setCell,
				setRow  : setRow,
				numRows : numRows,
			   };
	}

	var getRow = function(rowNum) {
		/*
		 * Get array of row values. rowNum is zero-based.
		 * Note that if the table includes a header row,
		 * then rowNum === zero returns the header.
		 */
		
		if (typeof(rowNum) === 'undefined') {
			throw "Must pass a row number to retrieve.";
		}
		
		// Get HTMLCollection of <tr> elements:
		let rows = tableEl.rows;
		if (rowNum >= rows.length) {
			throw `Table only contains ${rows.length} rows; caller asked for ${rowNum}`;
		}
		let row = tableEl.rows[rowNum];
		let resArr = [];
		for (let cell of row.cells) {
			resArr.push(cell.innerHTML);
		}
		return resArr;
	}
	
	var getCell = function(rowNum, colNum) {
		if (typeof(colNum) === 'undefined') {
			throw "Must pass a column number.";
		}
		let rowVals  = getRow(rowNum);
		
		if (colNum >= rowVals.length) {
			throw `Row ${rowNum} only has ${rowVal.length} columns, but ${colNum}'th column requested.`
		}
		
		return rowVals[colNum];
	}
	
	var setCell = function(rowNum, colNum, newVal) {
		let rowEl  = null;
		let cellEl = null;
	
		rowEl = tableEl.rows[rowNum];
		if (typeof(rowEl) === 'undefined') {
			throw `Row ${rowNum} does not exist in table.`
		}
		
		cellEl = rowEl.cells[colNum];
		if (typeof(cellEl) === undefined) {
			throw `Table row ${rowNum} does not contain column ${colNum}`
		}
		cellEl.innerHTML = newVal;
		return newVal;
	}
	
	var setRow = function(rowNum, dataArr) {
		let rowEl = null;

		rowEl = tableEl.rows[rowNum];
		if (typeof(rowEl) === 'undefined') {
			throw `Row ${rowNum} does not exist in table.`
		}
		let cellNum = 0;
		for (let cell of rowEl.cells) {
			cell.innerHTML = dataArr[cellNum++];
		}
		return dataArr;
	}
	
	var numRows = function() {
		return tbl.rows.length;
	}
	
	return constructor();
}
tbl = TableManager(['H1', 'H2'], [[10, 20], [30,40]])


/*
// Test getRow():

alert(tbl.getRow(0)) // ['H1', 'H2']
alert(tbl.getRow(1)) // [10,20]
alert(tbl.getRow(2)) // [30,40]

// Test getCell():

alert(tbl.getCell(1,0)); // === 10
alert(tbl.getCell(2,1)); // === 40

tbl.setCell(1,0, 100)
alert(tbl.getCell(1,0)); // === 100

tbl.setRow(1, ['Foo', 'Bar'])
alert(tbl.getRow(1)); // ['Foo','Bar']

tbl.setRow(3, ['Foo', 'Bar']) // ERROR: Row 3 does not exist in table
*/
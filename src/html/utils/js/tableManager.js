"use strict";

var TableManager = function(dataArr, headerArr) {
	
	var headerArr = headerArr;
	var dataArr   = dataArr;
	var tableEl   = null;

	/* ------------------------------------- Constructor ------------------- */
	
	/*---------------------------
	| constructor
	-----------------*/

	var constructor = function() {
		tableEl = document.createElement('TABLE');
		
		let dataIndx = 0;
		
		if (typeof(headerArr) !== 'undefined') {
			let headerRow = tableEl.insertRow(0);

			for (let headerColIndx in headerArr) {
				let cell = headerRow.insertCell(headerColIndx);
				cell.innerHTML = headerArr[headerColIndx];
			}
			dataIndx = 1;
		}		
		for (let dataItemArr of dataArr) {
			
			let row  = tableEl.insertRow(dataIndx++);

			let dataItemIndx = 0;
			for (let dataItem of dataItemArr) {
				let cell = row.insertCell(dataItemIndx++);
				cell.innerHTML = dataItem;
			}
		}
		
		return {getHeader : getHeader,
				getData   : getData,
				getRow    : getRow,
				getCol	  : getCol,
				getCell   : getCell,
				setCell   : setCell,
				setRow    : setRow,
				numRows   : numRows,
				value     : value,
				classed   : classed,
				IDed      : IDed,
			   };
	}

	/* ------------------------------------- Public Methods ------------------- */	
	
	/*---------------------------
	| getHeader
	-----------------*/
	
	/*
	 * Return header row, if it exists. This is 
	 * the value passed in to the instance creation
	 * call. If left out there, the return value here
	 * will be undefined.
	 */
	
	var getHeader = function() {
		return headerArr;
	}
	
	/*---------------------------
	| getData
	-----------------*/

	/*
	 * Return the array-of-array data values of the table.
	 * This value is what was passed in during table creation.
	 * Contrast this with the value() method, which returns
	 * the TABLE DOM element.
	 */
	
	var getData = function(inclHeader, inclCol0) {
		

		if (typeof(inclCol0) === 'undefined') {
			inclCol0 = true;
		}
		
		let resArr = dataArr;
		
		if (inclHeader) {
			resArr = [headerArr].concat([resArr]);
		}
		
		if (! inclCol0) {
			let tmpArr = [];
			for (let row of resArr) {
				tmpArr.push(row.slice(1));
			}
			resArr = tmpArr;
		}
			
		return resArr;
	}
	
	/*---------------------------
	| getRow
	-----------------*/
	
	var getRow = function(rowNum) {
		/*
		 * Get array of row values. rowNum is zero-based.
		 * Note that if the table includes a header row,
		 * then that header row is ignored. Row 0 will be the
		 * true zeroe'th *data* row, not the header. 
		 * 
		 * To retrieve the header row, use getHeader();
		 * 
		 * Returns a copy of the internally maintained
		 * matrix row.
		 */
		
		if (typeof(rowNum) !== 'number') {
			throw "Must pass a row number to retrieve.";
		}
		
		if (rowNum > dataArr.length) {
			throw `Table has ${dataArr.length} rows; caller asked for row ${rowNum}`;
		}
		
		// Return a *copy* of the row:
		return dataArr[rowNum].slice(0);
	}

	/*---------------------------
	| getCol
	-----------------*/
	
	var getCol = function(colNum) {
		/*
		 * Get array of col values. colNum is zero-based.
		 * Note that if the table includes a header row,
		 * then that header row is ignored. Row 0 will be the
		 * true zeroe'th *data* row, not the header. 
		 * 
		 * To retrieve the header row, use getHeader();
		 * 
		 * Returns a copy of the internally maintained
		 * matrix column.
		 */
		
		if (typeof(colNum) !== 'number') {
			throw "Must pass a column number to retrieve.";
		}
		
		if (colNum > dataArr[0].length) {
			throw `Table has ${dataArr[0].length} columns; caller asked for row ${colNum}`;
		}
		
		// Return a *copy* of the col:
		let colRes = [];
		for (let row of dataArr) {
			colRes.push(row[colNum]);
		}
		return colRes;
	}
	
	
	/*---------------------------
	| getCell
	-----------------*/

	var getCell = function(rowNum, colNum) {
		/*
		 * Get value from a cell. rowNum is zero-based.
		 * Note that if the table includes a header row,
		 * then this row is skipped. Row 0 will be the
		 * true zeroe'th *data* row, not the header. 
		 * 
		 * To retrieve the header row, use getHeader();
		 */
		
		if (typeof(colNum) !== 'number' ||
			typeof(rowNum) !== 'number') {
			throw `Must pass numbers for row and column; caller passed (${rowNum},${colNum}).`;
		}

		let rowVals  = getRow(rowNum);
		
		if (colNum >= rowVals.length) {
			throw `Row ${rowNum} only has ${rowVal.length} columns, but ${colNum}'th column requested.`
		}
		
		return rowVals[colNum];
	}
	
	/*---------------------------
	| setCell
	-----------------*/

	var setCell = function(rowNum, colNum, newVal) {
		
		/*
		 * Set value of a cell. rowNum is zero-based.
		 * Note that if the table includes a header row,
		 * then that header row is ignored. Row 0 will be the
		 * true zeroe'th *data* row, not the header.
		 * 
		 * Both the internal representation of the table,
		 * and the HTML are updated.
		 */
		
		let rowEl  = null;
		let cellEl = null;
	
		if (typeof(rowNum) !== 'number' ||
			typeof(colNum) !== 'number' ||
			rowNum < 0 ||
			colNum < 0) {
			throw `Row and col numbers must be positive integers, not [${rowNum},${colNum}].`
		}
		
		dataArr[rowNum][colNum] = newVal;
		
		
		if (typeof(headerArr) !== 'undefined') {
			// For HTML table, header is a regular row.
			// Skip that:
			rowNum++;
		}
		
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
	
	/*---------------------------
	| setRow
	-----------------*/

	var setRow = function(rowNum, newRow) {
		/*
		 * Replace one row. rowNum is zero-based.
		 * Note that if the table includes a header row,
		 * then that row is ignored. Row 0 will be the
		 * true zeroe'th *data* row, not the header. 
		 */
		
		let rowEl = null;

		if (typeof(headerArr) !== 'undefined') {
			rowEl = tableEl.rows[rowNum+1];
		} else {
			rowEl = tableEl.rows[rowNum];
		}
		if (typeof(rowEl) === 'undefined') {
			throw `Row ${rowNum} does not exist in table.`
		}
		
		dataArr[rowNum] = newRow;
		
		if (typeof(headerArr) !== 'undefined') {
			// HTML table includes the header
			// as row 0; account for that:
			rowNum++;
		}
		
		let cellNum = 0;
		for (let i=0; i<rowEl.cells.length; i++) {
			let cell = rowEl.cells[i];
			cell.innerHTML = newRow[cellNum++];
		}
		return newRow;
	}
	

	/*---------------------------
	| numRows
	-----------------*/
	
	var numRows = function() {
		return dataArr.rows.length;
	}
	

	/*---------------------------
	| value
	-----------------*/
	
	var value = function() {
		return tableEl;
	}
	
	/*---------------------------
	| classed
	-----------------*/
	
	var classed = function(classingDict) {
		/*
		 * If rowNum is undefined for row classing,
		 * then all rows are classed className.
		 * In cell: rowNum is undefined then all
		 * rows are classed className in the colNum
		 * column. If colNum is undefined, all cells
		 * in affected row(s) are classed className.
		 *
		 * All elements in the argument dict are optional.
		 * But if none is present the method does nothing. 
		 *  
		 * classingDict:
		 * 	  { table : <classNameTbl>,
		 *        row : [<classNameRow>, rowNum] // rowNum optional
		 *       cell : [<classNameCol>, rowNum, colNum]  
		 */
		
		// Classing table as a whole:
		if (typeof(classingDict.table) !== 'undefined') {
			tableEl.className = classingDict.table;
		}
		
		// Classing one of more row elements:
		if (typeof(classingDict.row) !== 'undefined') {
			let clName = classingDict.row[0];
			let rowNum = classingDict.row[1];

			// Only one row's columns to change?
			if (typeof(rowNum) === 'number') {
				tableEl.rows[rowNum].className = clName;
			} else {				
				// Change class of all rows:				
				for (let i=0; i<tableEl.rows.length; i++) {
					let trEl = tableEl.rows[i];
					trEl.className = clName;
				}
			}
		}
		
		if (typeof(classingDict.cell) !== 'undefined') {
			let clName  = classingDict.cell[0];
			let rowNum  = classingDict.cell[1];
			let colNum = classingDict.cell[2];
			
			// Only in one row?
			if (typeof(rowNum) === 'number') {
				// Just one row affected:
				let row = tableEl.rows[rowNum];
				// All cells in one row, or just one?
				if (typeof(colNum) === 'number') {
					// Only one cell in one row affected:
					row.cells[colNum].className = clName;
					return;
				} else {
					// All cells in one row affected:
					classCellsInOneRow(clName, row);
					return;
				}
			} else {
				// Multiple rows affected:
				for (let i=0; i<tableEl.rows.length; i++) {
					let rowEl = tableEl.rows[i];
				
					// Only one cell in each row?
					if (typeof(colNum) === 'number') {
						// Only one cell in each row:
						rowEl.cells[colNum].className = clName;
						continue; // next row.
					}  else {
						// All cells in all rows:
						classCellsInOneRow(clName, rowEl);
					}
				}
			}
		}
	}
	
	/*---------------------------
	| IDed
	-----------------*/

	/*
	 * Like the classed() method, but sets ID of table
	 * as a whole, of individual, or all rows, and of
	 * individual or all cells.
	 */
	
	var IDed = function(IDingDict) {
		/*
		 * If rowNum is undefined for row ID-setting,
		 * then all rows receive the given ID (generally 
		 * undesirable, but I'm not paternalistic).
		 *
		 * In cell: if rowNum is undefined then all
		 * rows receive the specified ID in the colNum
		 * column. 
		 * 
		 * If colNum is undefined, all cells
		 * in affected row(s) receive the specified ID.
		 * 
		 * All elements in the argument dict are optional.
		 * But if none is present the method does nothing. 
		 *  
		 * IDingDict:
		 * 	  { table : <IDTable>,
		 *        row : [<IDRow>, rowNum] // rowNum optional
		 *       cell : [<IDCol>, rowNum, colNum]  
		 */
		
		// Classing table as a whole:
		if (typeof(IDingDict.table) !== 'undefined') {
			tableEl.id = IDingDict.table;
		}
		
		// Classing one of more row elements:
		if (typeof(IDingDict.row) !== 'undefined') {
			let IDName = IDingDict.row[0];
			let rowNum = IDingDict.row[1];

			// Only one row's columns to change?
			if (typeof(rowNum) === 'number') {
				tableEl.rows[rowNum].id = IDName;
			} else {				
				// Change class of all rows:				
				for (let i=0; i<tableEl.rows.length; i++) {
					let trEl = tableEl.rows[i];
					trEl.id = IDName;
				}
			}
		}
		
		if (typeof(IDingDict.cell) !== 'undefined') {
			let IDName  = IDingDict.cell[0];
			let rowNum  = IDingDict.cell[1];
			let colNum = IDingDict.cell[2];
			
			// Only in one row?
			if (typeof(rowNum) === 'number') {
				// Just one row affected:
				let row = tableEl.rows[rowNum];
				// All cells in one row, or just one?
				if (typeof(colNum) === 'number') {
					// Only one cell in one row affected:
					row.cells[colNum].id = IDName;
					return;
				} else {
					// All cells in one row affected:
					classCellsInOneRow(IDName, row);
					return;
				}
			} else {
				// Multiple rows affected:
				for (let i=0; i<tableEl.rows.length; i++) {
					let rowEl = tableEl.rows[i];
					// Only one cell in each row?
					if (typeof(colNum) === 'number') {
						// Only one cell in each row:
						rowEl.cells[colNum].id = IDName;
						continue; // next row.
					}  else {
						// All cells in all rows:
						classCellsInOneRow(IDName, rowEl);
					}
				}
			}
		}
	}	
	
	/* ------------------------------------- Private Methods ------------------- */

	/*---------------------------
	| classCellsInOneRow
	-----------------*/
	
	var classCellsInOneRow = function(className, rowEl) {
		for (let i=0; i<rowEl.cells.length; i++) {
			let cellEl = rowEl.cells[i];
			cellEl.className = className;
		}
	}

	/*---------------------------
	| idCellsInOneRow
	-----------------*/
		
	var idCellsInOneRow = function(IDName, rowEl) {
		for (let i=0; i<rowEl.cells.length; i++) {
			let cellEl = rowEl.cells[i];
			cellEl.id = IDName;
		}
	}
	

	return constructor();
}

export { TableManager };

/*

// Test getRow():

tbl = TableManager([[10, 20], [30,40]], ['H1', 'H2'] )

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

tbl1 = TableManager([['blue', 'pink']]);

alert(tbl1.getRow(0)) // ['blue', 'pink']
alert(tbl1.getCell(0,1)) // 'pink'

tbl = TableManager([[10, 20], [30,40]], ['H1', 'H2'] )
divEl = document.getElementById("tstTable");
divEl.appendChild(tbl.value())

//tbl.classed({table : "testClass"}) // Whole tbl turns red.

//tbl.classed({row : ['testClass', 0]}) // first row turns 0
//tbl.classed({row : ['testClass', 2]}) // last row turns 0
//tbl.classed({row : ['testClass']}) // all rows turn 0

//tbl.classed({cell : ['testClass', 0,1]}) // H2 turns red
//tbl.classed({cell : ['testClass', 0]}) // H1 and H2 turn red
//tbl.classed({cell : ['testClass']}) // All cells turn red

// Getting raw data with/without header/first-col:

data = tbl.getData(); // [[10,20],[30,40]]
dataNoHead   = tbl.getData(false); // [[30, 40]]
dataNoCol    = tbl.getData(true,false); // [[20],[40]]
dataNeither  = tbl.getData(false,false); // [[40]]
console.log(dataNoHead);
console.log(dataNoCol);
console.log(dataNeither);

*/

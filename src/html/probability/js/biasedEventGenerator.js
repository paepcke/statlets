/*
 * Class constructor is given an object of 
 * event-probability pairs. Example:
 * 
 *       Event    Probability
 *    { 
 *       fire  : 0.013,
 *       rain  : 0.02,
 *    }
 * 
 * The algorithm is the "aliasing" method. 
 * See:
 *    https://en.wikipedia.org/wiki/Alias_method
 *    http://www.keithschwarz.com/darts-dice-coins/  # Long, detailed tutorial
 *        
 * This code is taken from:
 *    https://github.com/antimatter15/dist-sample-js/blob/master/alias.js
 *    
 * An instance of this class provides a next()
 * method that draws an event with biased randomness
 * derived from the distribution of probabilities.
 * 
 * The constructor takes an object whose keys are
 * discrete events (such as a cause of death, 
 * an occurrence in a game). Values are probabilities.
 * The constructor normalizes the probabilities,
 * builds the probabilities and alias arrays, and
 * returns the instance.
 * 
 * Usage: 
 *    var generator = AliasMethod(eventsPlusProbsObj);
 *    generator.next();
 *    generator.next();
 *       ...
 */

var EventGenerator = function(eventAndProbsObj) {
	
  var probabilities = [];
  var labelmap  	= [];
  var alias     	= [];
  var prob      	= [] 

  var constructor = function(eventAndProbsObject) {
	  
    var avg, count, i, label, large, less, more, p, small, sum, _i, _j, _len;
    
    // Build separate arrays of the events
    // and their respective probabilities:
    for (label in eventAndProbsObject) {
      if (eventAndProbsObject.hasOwnProperty(label)) {
        labelmap.push(label);
        probabilities.push(eventAndProbsObject[label]);
      }
    }
    // Get sum of probs...
    count = probabilities.length;
    sum = 0;
    for (_i = 0, _len = probabilities.length; _i < _len; _i++) {
      p = probabilities[_i];
      sum += p;
    }
    // Normalize the probs:
    probabilities = (function() {
      var _j, _len1, _results;
      _results = [];
      for (_j = 0, _len1 = probabilities.length; _j < _len1; _j++) {
        p = probabilities[_j];
        _results.push(p / sum);
      }
      return _results;
    })();
    
    // Build the probabilities- and alias arrays.
    // The alias array contains the events:
    avg = 1 / count;
    small = [];
    large = [];
    for (i = _j = 0; 0 <= count ? _j < count : _j > count; i = 0 <= count ? ++_j : --_j) {
      if (probabilities[i] >= avg) {
        large.push(i);
      } else {
        small.push(i);
      }
    }
    while (!(small.length === 0 || large.length === 0)) {
      less = small.pop();
      more = large.pop();
      prob[less] = probabilities[less] * count;
      alias[less] = more;
      probabilities[more] += probabilities[less] - avg;
      if (probabilities[more] >= avg) {
        large.push(more);
      } else {
        small.push(more);
      }
    }
    while (small.length !== 0) {
      prob[small.pop()] = 1;
    }
    while (large.length !== 0) {
      prob[large.pop()] = 1;
    }
    
    return {
    	next : next
    }
  }

  // The next() method that will be used by 
  // clients to draw another (biased) event:
  var next = function() {
    var col;
    col = Math.floor(Math.random() * prob.length);
    if (Math.random() < prob[col]) {
      return labelmap[col];
    } else {
      return labelmap[alias[col]];
    }
  };

  return constructor(eventAndProbsObj);

};		
		
// deathCauseGenerator = new EventGenerator(DEATH_CAUSES);

export { EventGenerator };
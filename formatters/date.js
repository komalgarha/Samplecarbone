var moment = require('moment');

moment.lang('fr');

module.exports = {
  /**
   * Converts a date from a pattern to another pattern
   * @param  {String} patternIn
   * @param  {String} patternOut
   * @return {String}
   */
  convert : function(d, patternIn, patternOut){
    return moment(d + '', patternIn).format(patternOut);
  },
  
  addDays : function(d, nbDay){
    return moment(d).add('days', parseInt(nbDay));
  },
  /**
   * Converts a date to a string with given pattern
   * @param  {String} pattern
   * @return {String}
   */
  format : function(d, pattern){
    return moment(d).format(pattern);
  },
  /**
   * Converts a string with given pattern to date
   * @param  {String} pattern
   * @return {Date}
   */
  parse : function(d, pattern){
    return moment(d + '', pattern).toDate();
  }
};

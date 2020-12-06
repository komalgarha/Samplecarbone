var assert = require('assert');
var helper  = require('../lib/helper');
var path  = require('path');
var fs  = require('fs');
var rootPath = process.cwd(); // where "make test" is called
var testPath = rootPath+'/test/test/';

describe('helper', function () {

  describe('getUID', function () {
    it('should return a unique id', function () {
      var _uid = helper.getUID();
      var _uid2 = helper.getUID();
      helper.assert((_uid!==_uid2), true);
    });
  });

  describe('getRandomString', function () {
    it('should return a random id', function () {
      var _uid = helper.getRandomString();
      var _uid2 = helper.getRandomString();
      helper.assert(_uid.length, 22);
      helper.assert((_uid!==_uid2), true);
    });
    it('should be fast and random', function () {
      var _loops = 1000;
      var _res = [];
      var _start = process.hrtime();
      for (let i = 0; i < _loops; i++) {
        _res.push(helper.getRandomString());
      }
      var _diff = process.hrtime(_start);
      helper.assert(_res.length, _loops);
      _res.sort();
      for (let i = 0; i < _loops - 1; i++) {
        if (_res[i] === _res[i+1]) {
          assert(false, 'Random string should be different');
        }
      }
      var _elapsed = ((_diff[0] * 1e9 + _diff[1]) / 1e6);
      console.log('\n getRandomString : ' + _elapsed + ' ms (around 1.3ms for 1000) \n');
      helper.assert(_elapsed > 5, false, 'getRandomString is too slow');
    });
  });

  describe('encodeSafeFilename|decodeSafeFilename', function () {
    it('should not crash if string is undefined or null', function () {
      helper.assert(helper.encodeSafeFilename(), '');
      helper.assert(helper.encodeSafeFilename(null), '');
    });
    it('should generate a safe filename from any string, and should be able to decode it', function () {
      helper.assert(helper.encodeSafeFilename('azertyuioopqsdfghjklmwxcvbn'), 'YXplcnR5dWlvb3Bxc2RmZ2hqa2xtd3hjdmJu');
      helper.assert(helper.decodeSafeFilename('YXplcnR5dWlvb3Bxc2RmZ2hqa2xtd3hjdmJu'), 'azertyuioopqsdfghjklmwxcvbn');

      // base64 character ends with =
      helper.assert(helper.encodeSafeFilename('01234567890'), 'MDEyMzQ1Njc4OTA');
      helper.assert(helper.decodeSafeFilename('MDEyMzQ1Njc4OTA'), '01234567890');

      // base64 character ends with ==
      helper.assert(helper.encodeSafeFilename('0123456789'), 'MDEyMzQ1Njc4OQ');
      helper.assert(helper.decodeSafeFilename('MDEyMzQ1Njc4OQ'), '0123456789');

      helper.assert(helper.encodeSafeFilename('n?./+£%*¨^../\\&éé"\'(§è!çà)-)'), 'bj8uLyvCoyUqwqheLi4vXCbDqcOpIicowqfDqCHDp8OgKS0p');
      helper.assert(helper.decodeSafeFilename('bj8uLyvCoyUqwqheLi4vXCbDqcOpIicowqfDqCHDp8OgKS0p'), 'n?./+£%*¨^../\\&éé"\'(§è!çà)-)');

      helper.assert(helper.encodeSafeFilename('报道'), '5oql6YGT');
      helper.assert(helper.decodeSafeFilename('5oql6YGT'), '报道');

      helper.assert(helper.encodeSafeFilename('k�'), 'a__-vQ');
      helper.assert(helper.decodeSafeFilename('a__-vQ'), 'k�');
      helper.assert(helper.decodeSafeFilename('a__-vQ'), 'k�');
    });
  });

  describe('cleanJavascriptVariable', function () {
    it('should return the same attribute name if there is no forbidden character in it', function () {
      helper.assert(helper.cleanJavascriptVariable('aa'), 'aa');
      helper.assert(helper.cleanJavascriptVariable('aa$'), 'aa$');
      helper.assert(helper.cleanJavascriptVariable('aa_'), 'aa_');
    });
    it('should replace forbidden character in attribute', function () {
      helper.assert(helper.cleanJavascriptVariable('aa-2'), 'aa_2');
      helper.assert(helper.cleanJavascriptVariable('aa+2'), 'aa_2');
      helper.assert(helper.cleanJavascriptVariable('aa/2'), 'aa_2');
      helper.assert(helper.cleanJavascriptVariable('aa*2'), 'aa_2');
      helper.assert(helper.cleanJavascriptVariable('aa>2'), 'aa_2');
      helper.assert(helper.cleanJavascriptVariable('aa<2'), 'aa_2');
      helper.assert(helper.cleanJavascriptVariable('aa!2'), 'aa_2');
      helper.assert(helper.cleanJavascriptVariable('aa=2'), 'aa_2');
      helper.assert(helper.cleanJavascriptVariable('aa\'2'), 'aa_2');
      helper.assert(helper.cleanJavascriptVariable('aa"2'), 'aa_2');
      helper.assert(helper.cleanJavascriptVariable('ab-+-/*!=.f'), 'ab________f');
    });
  });

  describe('getValueOfPath', function () {
    it('should do nothing if object is undefined', function () {
      helper.assert(helper.getValueOfPath(), undefined);
    });
    it('should get value of attribute if (first level)', function () {
      var _obj = {
        id : 1
      };
      helper.assert(helper.getValueOfPath(_obj, 'id'), 1);
    });
    it('should do nothing if object is undefined', function () {
      var _obj = {
        subObj : {
          subObj : {
            end : {
              label : 'bla'
            }
          }
        }
      };
      helper.assert(helper.getValueOfPath(_obj, 'subObj.subObj.end.label'), 'bla');
    });
    it('should be fast to sort 1 Millons of rows', function () {
      var _nbRows = 100000;
      var _res = 0;
      var _obj = {
        subObj : {
          subObj : {
            end : {
              val : 10
            },
            val : 1
          }
        }
      };
      var _start = process.hrtime();
      var _random = ['subObj.subObj.end.val', 'subObj.subObj.val'];
      for (var i = 0; i < _nbRows; i++) {
        _res += helper.getValueOfPath(_obj, _random[Math.round(Math.random())]);
      }
      var _diff = process.hrtime(_start);
      var _elapsed = ((_diff[0] * 1e9 + _diff[1]) / 1e6);
      console.log('\n getValueOfPath speed : ' + _elapsed  + ' ms (usually around 30 ms) '+_res+'\n');
      helper.assert(_elapsed < 100, true);
    });
  });

  describe('removeDuplicatedRows', function () {
    it('should do nothing if the array is empty', function () {
      helper.assert(helper.removeDuplicatedRows([]), []);
    });
    it('should do nothing with an array of length = 1', function () {
      helper.assert(helper.removeDuplicatedRows(['aa']), ['aa']);
    });
    it('should remove duplicated rows', function () {
      helper.assert(helper.removeDuplicatedRows(['aa', 'aa', 'aa', 'bb', 'cc', 'cc', 'yy']), ['aa', 'bb', 'cc', 'yy']);
    });
  });

  describe('removeQuote', function () {
    it('should do nothing if it is not a string', function () {
      helper.assert(helper.removeQuote(), undefined);
      helper.assert(helper.removeQuote(null), null);
      helper.assert(helper.removeQuote(22), 22);
    });
    it('should remove quote form string', function () {
      helper.assert(helper.removeQuote('sdsd'), 'sdsd');
      helper.assert(helper.removeQuote('\'sdsd\''), 'sdsd');
      helper.assert(helper.removeQuote('"sdsd"'), 'sdsd');
    });
    it('should not remove quote inside string', function () {
      helper.assert(helper.removeQuote('"sd \' sd"'), 'sd \' sd');
      helper.assert(helper.removeQuote('\'sd " sd\''), 'sd " sd');
    });
  });

  describe('readFileDirSync', function () {
    beforeEach(function () {
      helper.rmDirRecursive(testPath);
    });
    after(function () {
      helper.rmDirRecursive(testPath);
    });
    it('should read a directory and return the content of each file in an object', function (done) {
      // create the directory
      fs.mkdirSync(testPath, parseInt('0755', 8));
      var _allFiles = [
        path.join(testPath, 'test.sql'),
        path.join(testPath, 'test1.sql'),
        path.join(testPath, 'test2.sql')
      ];
      fs.writeFileSync(_allFiles[0], 'file 1');
      fs.writeFileSync(_allFiles[1], 'file 2');
      fs.writeFileSync(_allFiles[2], 'file 3');
      var _expectedResult = {};
      _expectedResult[_allFiles[0]] = 'file 1';
      _expectedResult[_allFiles[1]] = 'file 2';
      _expectedResult[_allFiles[2]] = 'file 3';
      helper.assert(helper.readFileDirSync(testPath), _expectedResult);
      done();
    });
    it('should only parse .sql files', function (done) {
      // create the directory
      fs.mkdirSync(testPath, parseInt('0755', 8));
      var _allFiles = [
        path.join(testPath, 'test.sql'),
        path.join(testPath, 'test1.js'),
        path.join(testPath, 'test2.csv')
      ];
      fs.writeFileSync(_allFiles[0], 'file 1');
      fs.writeFileSync(_allFiles[1], 'file 2');
      fs.writeFileSync(_allFiles[2], 'file 3');
      var _expectedResult = {};
      _expectedResult[_allFiles[0]] = 'file 1';
      helper.assert(helper.readFileDirSync(testPath, 'sql'), _expectedResult);
      done();
    });
  });


  describe('rmDirRecursive(dir)' ,function () {
    it('should remove the directory specified', function (done) {
      var _testedPath = path.join(__dirname, 'createdDir');
      // create the directory
      if (!fs.existsSync(_testedPath)) {
        fs.mkdirSync(_testedPath, parseInt('0755', 8));
      }
      fs.writeFileSync(path.join(_testedPath, 'test.js'), 'test');
      fs.writeFileSync(path.join(_testedPath, 'test2.sql'), 'test');
      var _subDir = path.join(_testedPath, 'otherDir');
      if (!fs.existsSync(_subDir)) {
        fs.mkdirSync(_subDir, parseInt('0755', 8));
      }
      fs.writeFileSync(path.join(_subDir, 'testsub.sql'), 'test');

      helper.rmDirRecursive(_testedPath);

      assert.equal(fs.existsSync(_testedPath), false);
      done();
    });
  });


  describe('walkDirSync(dir, extension)' ,function () {
    beforeEach(function () {
      var _testedPath = path.join(__dirname, 'walkDirTest');
      helper.rmDirRecursive(_testedPath);
    });
    after(function () {
      var _testedPath = path.join(__dirname, 'walkDirTest');
      helper.rmDirRecursive(_testedPath);
    });
    it('should return an empty array if the directory does not exist or if the directory is empty', function (done) {
      var _testedPath = path.join(__dirname, 'walkDirTest');
      var _result = helper.walkDirSync(_testedPath);
      assert.equal(_result.length, 0);
      done();
    });
    it('should return an empty array if the directory is empty', function (done) {
      var _testedPath = path.join(__dirname, 'walkDirTest');
      var _subDir = path.join(_testedPath, 'otherDir');
      // create the directory
      fs.mkdirSync(_testedPath, parseInt('0755', 8));
      fs.mkdirSync(_subDir, parseInt('0755', 8));
      var _result = helper.walkDirSync(_testedPath);
      assert.equal(_result.length, 0);
      done();
    });
    it('should return all the files if no extension is specified', function (done) {
      var _testedPath = path.join(__dirname, 'walkDirTest');
      var _subDir = path.join(_testedPath, 'otherDir');
      // create the directory
      fs.mkdirSync(_testedPath, parseInt('0755', 8));
      fs.mkdirSync(_subDir, parseInt('0755', 8));
      var _expectedResult = [
        path.join(_subDir, 'testsub1.sql'),
        path.join(_subDir, 'testsub2.sql'),
        path.join(_testedPath, 'test'),
        path.join(_testedPath, 'test1.js'),
        path.join(_testedPath, 'test2.js')
      ];
      fs.writeFileSync(_expectedResult[0], '');
      fs.writeFileSync(_expectedResult[1], '');
      fs.writeFileSync(_expectedResult[2], '');
      fs.writeFileSync(_expectedResult[3], '');
      fs.writeFileSync(_expectedResult[4], '');
      var _result = helper.walkDirSync(_testedPath);
      assert.equal(JSON.stringify(_result), JSON.stringify(_expectedResult));
      done();
    });
  });


  describe('copyDirSync(dirSource, dirDest)' ,function () {
    it('should remove the directory specified', function (done) {
      var _sourcePath = path.join(__dirname, 'datasets', 'helperDirTest');
      var _destPath = path.join(__dirname);
      helper.copyDirSync(_sourcePath, _destPath);
      assert(fs.existsSync(path.join(__dirname, 'helperDirTest')));
      assert(fs.existsSync(path.join(__dirname, 'helperDirTest', 'create.sql')));
      assert(fs.existsSync(path.join(__dirname, 'helperDirTest', 'test', 'create.sql')));
      assert(fs.existsSync(path.join(__dirname, 'helperDirTest', 'test', 'destroy.sql')));
      assert(fs.existsSync(path.join(__dirname, 'helperDirTest', 'test', 'list.sql')));
      assert(fs.existsSync(path.join(__dirname, 'helperDirTest', 'test', 'update.sql')));
      var _testedDir = path.join(__dirname, 'helperDirTest');
      helper.rmDirRecursive(_testedDir);
      done();
    });
  });

  describe('distance(str, str)', function () {
    it('should return 0 with empty string', function () {
      assert.equal( helper.distance('', ''), 0 );
    });
    it('should return 2 if there is two different character', function () {
      assert.equal( helper.distance('titi', 'toto'), 2);
    });
    it('should return 2 if there is two different character', function () {
      assert.equal( helper.distance('azertyuiop12345', 'ytrezauiop02345'), 7);
    });
  });

  describe('findClosest(str, choices)', function () {
    it('should return an empty string', function () {
      assert.equal( helper.findClosest(''   , [])       , '' );
      assert.equal( helper.findClosest(''   , [''])     , '' );
      assert.equal( helper.findClosest('bla', [])       , '' );
      assert.equal( helper.findClosest(''   , ['bla'])  , '' );
    });
    it('should return toto', function () {
      assert.equal( helper.findClosest('titi', ['blabla', 'croco', 'toto']), 'toto');
    });
    it('should accept an object of choices', function () {
      assert.equal( helper.findClosest('titi', {blabla : 1, croco : 2, toto : 3}), 'toto');
    });
  });

  describe('genericQueue', () => {

    it('should process one element', () => {
      let _nb    = [];
      let _queue = helper.genericQueue(
        [{ id : 1 }]
        , item => {
          _nb.push(item.id);
        }
      );

      _queue.start();
      helper.assert(_nb, [1]);
    });

    it('should process multiple elements', () => {
      let _nb    = [];
      let _queue = helper.genericQueue(
        [{ id : 1 }, { id : 2 }, { id : 3 }]
        , (item, next) => {
          _nb.push(item.id);
          next();
        }
      );

      _queue.start();
      helper.assert(_nb, [1, 2, 3]);
    });

    it('should return error', () => {
      let _nb    = [];
      let _error = null;
      let _queue = helper.genericQueue(
        [{ id : 1 , error : 'error' }, { id : 2 }, { id : 3 }]
        , (item, next) => {
          if (item.error) {
            return next(item.error);
          }

          _nb.push(item.id);
          next();
        }
        , err => {
          _error = err;
        }
      );

      _queue.start();
      helper.assert(_nb,[2, 3]);
      helper.assert(_error, 'error');
    });

    it('should stop the queue on error when option is set', () => {

      let _nb    = [];
      let _error = null;
      let _success = false;
      let _items = [{ id : 1 }, { id : 2, error : 'error' }, { id : 3 }];
      let _options = { stopOnError : true };

      function handlerItem (item, next) {
        if (item.error) {
          return next(item.error);
        }

        _nb.push(item.id);
        next();
      }

      function handlerSuccess () {
        _success = true;
      }

      function handlerError (err) {
        _error = err;
      }

      helper.genericQueue(_items, handlerItem, handlerError, handlerSuccess, _options).start();

      helper.assert(_nb, [1]);
      helper.assert(_error, 'error');
      helper.assert(_success, false);
    });

    it('should process multiple elements and call callback end function when it is finished', (done) => {
      let _nb    = [];
      let _queue = helper.genericQueue(
        [{ id : 1 }, { id : 2 }, { id : 3 }]
        , (item, next) => {
          setTimeout(() => {
            _nb.push(item.id);
            next();
          }, 100);
        }
        , null
        , () => {
          helper.assert(_nb, [1, 2, 3]);
          done();
        }
      );

      _queue.start();
    });

    it('should not start the queue twice if .start is called twice', (done) => {
      let _nb    = [];
      let _queue = helper.genericQueue(
        [{ id : 1 }, { id : 2 }, { id : 3 }]
        , (item, next) => {
          setTimeout(() => {
            _nb.push(item.id);
            next();
          }, 100 / item.id);
        }
        , null
        , () => {
          helper.assert(_nb, [1, 2, 3]);
          done();
        }
      );
      _queue.start();
      _queue.start();
    });

    it('should restart even after a first run', () => {
      let _nb    = [];
      let _queue = helper.genericQueue(
        [{ id : 1 }]
        , (item, next) => {
          _nb.push(item.id);
          next();
        }
      );
      _queue.start();
      helper.assert(_nb, [1]);
      _queue.items.push({ id : 2 });
      _queue.start();
      helper.assert(_nb, [1, 2]);
    });

  });

  describe('mergeObjects', () => {
    it('should merge obj2 into obj1 with a simple property', function () {
      let obj1 = { firstname : 'John' };
      let obj2 = { lastname : 'Wick' };
      obj1 = helper.mergeObjects(obj1, obj2);
      helper.assert(obj1, {firstname : 'John', lastname : 'Wick' });
    });
    it('should merge obj2 into obj1 with multiple properties 1', function () {
      let obj1 = { firstname : 'John', lastname : 'Wick', age : 55, city : 'Toronto', postalcode : 32123 };
      let obj2 = { lastname : 'Cena', age : 43, city : 'West Newbury' };
      obj1 = helper.mergeObjects(obj1, obj2);
      helper.assert(obj1, { firstname : 'John', lastname : 'Cena', age : 43, city : 'West Newbury', postalcode : 32123 });
    });
    it('should merge obj2 into obj1 with multiple properties 2', function () {
      let obj1 = { fruit : 'apple', id : 2, validate : false, limit : 5, name : 'foo' };
      let obj2 = { firstname : 'John', lastname : 'Wick', id : 9, validate : true, name : 'bar' };
      obj1 = helper.mergeObjects(obj1, obj2);
      helper.assert(obj1, { fruit : 'apple', id : 9,  validate : true, limit : 5, name : 'bar', firstname : 'John', lastname : 'Wick' });
    });
    it('should merge obj2 into obj1 with multiple properties 3', function () {
      let obj1 = { validate : false, limit : 5, name : 'foo', fruitsList : ['banana'], properties : { child : { id : 1}} };
      let obj2 = { validate : true, name : 'bar', fruitsList : ['tomatoes', 'apples', 'pineapples'], properties : { child : { id : 2}} };
      obj1 = helper.mergeObjects(obj1, obj2);
      helper.assert(obj1, { validate : true, limit : 5, name : 'bar', fruitsList : ['tomatoes', 'apples', 'pineapples'], properties : { child : { id : 2 } }  });
    });
  });

  describe('Get file extension from URL', function () {
    it('should return a png/jpeg/gif/txt extension', function () {
      helper.assert(helper.getFileExtensionFromUrl('https://google.com/image-flag-fr.png'), 'png');
      helper.assert(helper.getFileExtensionFromUrl('https://google.com/image.gif'), 'gif');
      helper.assert(helper.getFileExtensionFromUrl('https://google.com/image.with.lot.of.points.jpeg'), 'jpeg');
      helper.assert(helper.getFileExtensionFromUrl('https://google.com/image-flag-fr.txt'), 'txt');
    });
    it('should return a png/jpeg/gif/txt extension with query parameters', function () {
      helper.assert(helper.getFileExtensionFromUrl('https://google.com/image-flag-fr.png?fewfw=223&lala=few'), 'png');
      helper.assert(helper.getFileExtensionFromUrl('https://google.com/image.gif#fewfw=223?lala=few'), 'gif');
      helper.assert(helper.getFileExtensionFromUrl('https://google.com/image.with.lot.of.points.jpeg&name=John'), 'jpeg');
      helper.assert(helper.getFileExtensionFromUrl('https://google.com/image-flag-fr.txt?name=john&age=2#lala'), 'txt');
    });
  });

  describe('Find the relative path between 2 markers', function () {
    it('should find the relative path between 2 markers', function () {
      helper.assert(helper.getMarkerRelativePath('d.list[i].color', 'd.list[i].color2'), '.color2');
    });
    it('should find the relative path between a list and an object 1', function () {
      helper.assert(helper.getMarkerRelativePath('d.list[i].color', 'd.color2'), '..color2');
    });
    it('should find the relative path between a list and an object 2', function () {
      helper.assert(helper.getMarkerRelativePath('d.color', 'd.list2[i].color2'), '.list2[i].color2');
    });
    it('should find the relative path between a list and an object 3', function () {
      helper.assert(helper.getMarkerRelativePath('d.list[i].color', 'd.element.color2'), '..element.color2');
    });
    it('should find the relative path between a list and an object 4', function () {
      helper.assert(helper.getMarkerRelativePath('d.element.color2', 'd.list[i].color'), '..list[i].color');
    });
    it('should find the relative path between a list and an object 5', function () {
      helper.assert(helper.getMarkerRelativePath('d.element.color2', 'd.element.list[i].color'), '.list[i].color');
    });
    it('should find the relative path between a list and an object 6', function () {
      helper.assert(helper.getMarkerRelativePath('d.element.color2.object.apple.yellow', 'd.element.list[i].color'), '....list[i].color');
    });
    it('should find the relative path between two list 1', function () {
      helper.assert(helper.getMarkerRelativePath('d.list[i].color', 'd.list[i].list[i].color2'), '.list[i].color2');
    });
    it('should find the relative path between two list 2', function () {
      helper.assert(helper.getMarkerRelativePath('d.list[i].list[2].color', 'd.list[i].color2'), '..color2');
    });
    it('should find the relative path between two list 3', function () {
      helper.assert(helper.getMarkerRelativePath('d.list[i].color', 'd.list2[i].color2'), '..list2[i].color2');
    });
    it('should find the relative path between two list 4 with similar object names', function () {
      helper.assert(helper.getMarkerRelativePath('d.list[i].color.red', 'd.list2[i].color2.red.blue'), '...list2[i].color2.red.blue');
    });
    it('Test errors with invalid args', function () {
      helper.assert(helper.getMarkerRelativePath('', 'd.list2[i].color2.red.blue'), '');
      helper.assert(helper.getMarkerRelativePath('d.list', ''), '');
      helper.assert(helper.getMarkerRelativePath(null, 'd.element'), '');
      helper.assert(helper.getMarkerRelativePath('d.element', null), '');
      helper.assert(helper.getMarkerRelativePath(undefined, 'd.element'), '');
      helper.assert(helper.getMarkerRelativePath('d.element', undefined), '');
      helper.assert(helper.getMarkerRelativePath(21, 'd.element'), '');
      helper.assert(helper.getMarkerRelativePath('d.element', 32), '');
    });
  });

  describe('insertAt', function () {
    it('should insert text inside a content at a specific position', function () {
      const _content = 'Western robin (Eopsaltria griseogularis).';
      helper.assert(helper.insertAt(_content, 7, ' yellow'), 'Western yellow robin (Eopsaltria griseogularis).');
      helper.assert(helper.insertAt(_content, 0, 'yellow '), 'yellow Western robin (Eopsaltria griseogularis).');
      helper.assert(helper.insertAt(_content, _content.length, ' yellow'), 'Western robin (Eopsaltria griseogularis). yellow');
      helper.assert(helper.insertAt('', 0, 'yellow'), 'yellow');
    });

    it('should throw errors if the arguments are invalid', function () {
      // Null arguments
      assert.throws(() => helper.insertAt(null, 7, ' yellow'), new Error('The arguments are invalid (null or undefined).'));
      assert.throws(() => helper.insertAt('text', null, ' yellow'), new Error('The arguments are invalid (null or undefined).'));
      assert.throws(() => helper.insertAt('text', 8, null), new Error('The arguments are invalid (null or undefined).'));
      // position out of the range
      assert.throws(() => helper.insertAt('text', -1, 'yellow'), new Error('The index is outside of the text length range.'));
      assert.throws(() => helper.insertAt('text', 10, 'yellow'), new Error('The index is outside of the text length range.'));
      assert.throws(() => helper.insertAt('', 1, 'yellow'), new Error('The index is outside of the text length range.'));
    });
  });

  describe('compareStringFromPosition', function () {
    it('Should find the text searched on the content at a specific position.', function () {
      const _content = 'Western yellow robin (Eopsaltria griseogularis).';
      helper.assert(helper.compareStringFromPosition('yellow', _content, 8), true);
      helper.assert(helper.compareStringFromPosition(' robin ', _content, 14), true);
      helper.assert(helper.compareStringFromPosition('opsaltr', _content, 23), true);
      helper.assert(helper.compareStringFromPosition('griseogularis).', _content, 33), true);
    });

    it('Should NOT find the text searched on the content at a specific position.', function () {
      const _content = 'Western yellow robin (Eopsaltria griseogularis).';
      helper.assert(helper.compareStringFromPosition('yelow', _content, 8), false);
      helper.assert(helper.compareStringFromPosition('robin ', _content, 14), false);
      helper.assert(helper.compareStringFromPosition('opsaltr', _content, 24), false);
      helper.assert(helper.compareStringFromPosition('griseogularis).', _content, 1), false);
      helper.assert(helper.compareStringFromPosition('yellow', 'yel', 1), false);
    });

    it('Should throw an error if an argument is invalid', function () {
      // arguments undefined or null
      assert.throws(() => helper.compareStringFromPosition(null, 'text', 1), new Error('The arguments are invalid (null or undefined).'));
      assert.throws(() => helper.compareStringFromPosition('text', null, 1), new Error('The arguments are invalid (null or undefined).'));
      assert.throws(() => helper.compareStringFromPosition('text', 'text 1234', undefined), new Error('The arguments are invalid (null or undefined).'));
      // the index is out of the text range
      assert.throws(() => helper.compareStringFromPosition('blue', 'blue', -1), new Error('The index is outside of the text length range.'));
      assert.throws(() => helper.compareStringFromPosition('blue', 'blue', 10), new Error('The index is outside of the text length range.'));
    });
  });
});

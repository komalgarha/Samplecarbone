var rootPath = process.cwd(); //where "make test" is called 
var assert = require('assert');
var fs = require('fs');
var spawn = require('child_process').spawn;
var http = require("http");
var Socket = require('../lib/socket');  
var url = require('url');
var helper  = require('../lib/helper');
var format  = require('../lib/format');
var path = require('path');
var server;
var tempPath = path.join(__dirname,'tempfile');

var commandToTest = rootPath+'/bin/carbone'; 

describe('Socket', function(){

  describe('client.send / events message, close, error, connect,...', function(){
    it('should start the server, connect a client, send a message from the server to the client and vice-versa and stop the client and server', function(done){
      //start the server
      var _server = new Socket(4000, '127.0.0.1');
      _server.startServer(function(){
        //start the client
        var _client = new Socket(4000, '127.0.0.1');
        _client.startClient(function(){
          _client.send('1# hello, Im the client');
        });
        _client.on('message', function(messageFromServer){
          assert.equal(messageFromServer.data, 'Hi, Im the server, Im the boss, the client is not the king here! So listen to me');
          _client.stop(function(){
            _server.stop(done);
          });
        });
      });
      _server.on('message', function(messageFromClient){
        assert.equal(messageFromClient.data, '1# hello, Im the client');
        messageFromClient.send('Hi, Im the server, Im the boss, the client is not the king here! So listen to me');
      });
    });
    it('should accept objects in messages', function(done){
      var _objTransmitted = {
        'data' : 12270207,
        'price' : 3.420920,
        'text' : 'hj kljhéà! àç 12233# "-àç"!é)àç-\'',
        'myBoolean' : true,
        'myArrayOfObject' : [{'id': 2}, {'id': 3}],
        'myArrayOfInt' : [10,23,45]
      };
      //start the server
      var _server = new Socket(4000, '127.0.0.1');
      _server.startServer(function(){
        //start the client
        var _client = new Socket(4000, '127.0.0.1');
        _client.startClient(function(){
          _client.send(_objTransmitted);
        });
        _client.on('message', function(messageFromServer){
          helper.assert(messageFromServer.data, _objTransmitted);
          _client.stop(function(){
            _server.stop(done);
          });
        });
      });
      _server.on('message', function(messageFromClient){
        helper.assert(messageFromClient.data, _objTransmitted);
        messageFromClient.data = 1000000; //check the data is really transmitted
        messageFromClient.send(_objTransmitted);
      });
    });
    it('should buffer messages if the client is not yet connected. It should keep the order', function(done){
      var _client = null;
      var _server = new Socket(4000, '127.0.0.1');
      _server.startServer(function(){
        _client = new Socket(4000, '127.0.0.1');
        _client.startClient(); //we do not wait for the connection
        for (var i = 0; i < 3; i++) {
          _client.send('my super message which must leave now '+i);
        };
      });
      var _received = 0;
      _server.on('message', function(messageFromClient){
        helper.assert(messageFromClient.data, 'my super message which must leave now '+_received);
        _received++;
        if(_received === 3){
          _client.stop(function(){
            _server.stop(done);
          });
        }
      });
    });
    it('should send a message and get a response from the server in the callback even if the packet are queued', function(done){
      executeServer('response', function(){
        var _client = null;
        var _nbError = 0;
        var _nbReceived = 0;
        _client = new Socket(4000, '127.0.0.1');
        _client.startClient(); 
        _client.on('error', function(err){
          _nbError++;
        });
        _client.send('client1', function(err, response){
          helper.assert(response.data, 'client1server');
          _nbReceived++;
          if(_nbReceived===3){ theEnd(); }
        });
        _client.send('client2', function(err, response){
          helper.assert(response.data, 'client2server');
          _nbReceived++;
          if(_nbReceived===3){ theEnd(); }
        });
        _client.send('client3', function(err, response){
          helper.assert(response.data, 'client3server');
          _nbReceived++;
          if(_nbReceived===3){ theEnd(); }
        });
        function theEnd(){
          _client.stop(function(){
            stopServer(done);
          });
        }
      });
    });
    it('should receive a timeout error if the server is too long to answer', function(done){
      executeServer('response', function(){
        var _client = null;
        var _nbError = 0;
        var _nbReceived = 0;
        _client = new Socket(4000, '127.0.0.1', 50);
        _client.startClient(); 
        _client.on('error', function(err){
          _nbError++;
        });
        //The server adds a virtual latency if the "client1" message is received
        _client.send('client1', function(err, response){
          helper.assert(err, 'Timeout reached');
          helper.assert(response, null);
          _nbReceived++;
          if(_nbReceived===3){ theEnd(); }
        });
        _client.send('client2', function(err, response){
          helper.assert(response.data, 'client2server');
          _nbReceived++;
          if(_nbReceived===3){ theEnd(); }
        });
        _client.send('client3', function(err, response){
          helper.assert(response.data, 'client3server');
          _nbReceived++;
          if(_nbReceived===3){ theEnd(); }
        });
        function theEnd(){
          _client.stop(function(){
            stopServer(done);
          });
        }
      });
    });
    it('should be fast', function(done){
      executeServer('server', function(){
        var _client = new Socket(4000, '127.0.0.1');
        _client.startClient(function(){
          var _nbExecuted = 40000;
          var _waitedResponse = _nbExecuted;
          var _start = new Date();
          for (var i = 0; i < _nbExecuted; i++) {
            _client.send('client'+i);
          };
          _client.on('message',function(message){
            _waitedResponse--;
            if(_waitedResponse === 0){
              theEnd();
            }
          });
          function theEnd(){
            var _end = new Date();
            var _elapsed = (_end.getTime() - _start.getTime()); 
            var _elapsedPerTransmission = _elapsed/_nbExecuted; 
            console.log('\n\n Socket - Time Elapsed : '+_elapsedPerTransmission + ' ms per transmission (ping-pong) for '+_nbExecuted+' transmissions ('+_elapsed+'ms)\n\n\n');
            assert.equal((_elapsed < 1400), true);
            _client.stop(function(){
              stopServer(done);
            });
          }
        });
      });
    });
    it('should works in all circumstances (queue, timeout, ...)', function(done){
      executeServer('response', function(){
        var _client = new Socket(4000, '127.0.0.1', 50);
        var _nbExecuted = 100;
        var _nbTimeout = 0;
        var _nbReceivedInTime = 0;
        var _nbReceived = 0;
        var _waitedResponse = _nbExecuted;
        _client.startClient();
        var _start = new Date();
        for (var i = 0; i < _nbExecuted; i++) {
          var _clientId = i%2;
          if(i!==51){
            _client.send('client'+_clientId, getCallback(_clientId));
          }
          else{
            //send without callback with a timeout
            _client.send('client'+_clientId);
          }
        };
        function getCallback(clientId){
          return function(err, response){
            if(err){
              helper.assert(response, null);
              _nbTimeout++;
            }
            else{
              helper.assert(response.data, 'client'+clientId+'server');
              _nbReceivedInTime++;
            }
          }
        }
        _client.on('message',function(message){
          _nbReceived++;
          if(_nbReceived === _nbExecuted){
            theEnd();
          }
        });
        function theEnd(){
          helper.assert(_nbTimeout, 49);
          helper.assert(_nbReceivedInTime, 50);
          helper.assert(_nbReceived, 100);
          helper.assert(_client._queue.length, 0); //queue should be empty
          _client.stop(function(){
            stopServer(done);
          });
        }
      });
    });
    it('should accept multiple clients and it should not mix messages between clients', function(done){
      var _client1timer = null; var _client1 = null;
      var _client2timer = null; var _client2 = null;
      var _client3timer = null; var _client3 = null;
      var _nbMessageReceivedServerSide = {'client1':0, 'client2':0, 'client3':0};
      var _nbMessageReceivedClientSide = {'client1':0, 'client2':0, 'client3':0};
      var _server = new Socket(4000, '127.0.0.1');
      _server.startServer(function(){
        //start the client1
        _client1 = new Socket(4000, '127.0.0.1');
        _client1.startClient(function(){
          _client1timer = setInterval(function(){
            _client1.send('client1');
          },6);
        });
        _client1.on('message', function(messageFromServer){
          _nbMessageReceivedClientSide['client1']++;
          assert.equal(messageFromServer.data, 'client1');
        });
        //start the client2
        _client2 = new Socket(4000, '127.0.0.1');
        _client2.startClient(function(){
          _client2timer = setInterval(function(){
            _client2.send('client2');
          },7);
        });
        _client2.on('message', function(messageFromServer){
          _nbMessageReceivedClientSide['client2']++;
          assert.equal(messageFromServer.data, 'client2');
        });
        //start the client3
        _client3 = new Socket(4000, '127.0.0.1');
        _client3.startClient(function(){
          _client3timer = setInterval(function(){
            _client3.send('client3');
          },11);
        });
        _client3.on('message', function(messageFromServer){
          _nbMessageReceivedClientSide['client3']++;
          assert.equal(messageFromServer.data, 'client3');
        });
      });
      _server.on('message', function(messageFromClient){
        _nbMessageReceivedServerSide[messageFromClient.data]++;
        messageFromClient.send(messageFromClient.data);
      });
      setTimeout(function(){
        clearInterval(_client1timer);
        clearInterval(_client2timer);
        clearInterval(_client3timer);
        _client1.stop(function(){
          _client2.stop(function(){
            _client3.stop(function(){
              _server.stop(function(){
                helper.assert(_nbMessageReceivedServerSide, _nbMessageReceivedClientSide);
                helper.assert(_nbMessageReceivedServerSide['client1']>6, true);
                helper.assert(_nbMessageReceivedServerSide['client2']>6, true);
                helper.assert(_nbMessageReceivedServerSide['client3']>6, true);
                done();
              });
            });
          });
        });
      },100);
    });
    it('should reconnect automatically the client if the server is down for a moment. It should buffer messages\
      It must fire the error event. It mandatory to listen on error events otherwise it crashes', function(done){
      var _client = null; 
      var _timer = null; 
      var _sent = 0;
      var _nbError = 0;
      var _nbClose = 0;
      var _nbConnect = 0;
      var _nbReceived = 0;
      var _nbCallback = 0;
      _client = new Socket(4000, '127.0.0.1', 5000, 50);
      _client.startClient(); 
      _timer = setInterval(function(){
        _sent++;
        _client.send('message for a drunk server');
      }, 5);
      _client.on('error', function(err){
        _nbError++;
      });
      _client.on('connect', function(err){
        _nbConnect++;
      });
      _client.on('close', function(err){
        _nbClose++;
      });
      _client.on('message', function(message){
        _nbReceived++;
      });
      executeServer('simple', function(){
        setTimeout(function(){
          stopServer(function(){
            executeServer('simple', function(){
              setTimeout(function(){
                clearInterval(_timer);
                stopServer(function(){
                  _client.stop(function(){
                    assert.equal(Math.abs(_nbReceived-_sent)<5, true);
                    assert.equal(_sent>100, true);
                    assert.equal(_nbReceived>100, true);
                    assert.equal(_nbClose>1, true);
                    assert.equal(_nbConnect>1, true);
                    done();
                  });
                });
              },400)
            });
          });
        },400)
      });
    });
  });
});

var server;
function executeServer(filename, callback){
  server = spawn(path.join(__dirname,'socket', filename+'.js'), [], {cwd: __dirname});
  setTimeout(function(){
    callback();
  }, 100);
}

function stopServer(callback){
  if(server){
    server.kill()
  }
  setTimeout(function(){
    callback();
  }, 200);
}

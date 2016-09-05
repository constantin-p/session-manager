function encryptData(key, data) {
}

function decryptData(key, data) {
}

function encodeData(data) {
  return data;
  return JSON.stringify(data);
}

function decodeData(data) {
  return data;
  data = data || "{}";
  return JSON.parse(data);
}

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i = 0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}


function Store(name, cb) {
  var self = this;
	this._dbName = name;
  cb = cb || function () {};

  return new Promise(function(resolve, reject) {
    chrome.storage.local.get(self._dbName, function (_eData) {
      handleRuntimeError('SET:Store', chrome.runtime.lastError);


      if (!_eData || !_eData[self._dbName]) {
        var data = {};

        data[self._dbName] = encodeData({
    			sessions: []
    		});

        chrome.storage.local.set(data, function() {
          handleRuntimeError('SET:Store', chrome.runtime.lastError);
          var _data = decodeData(data[self._dbName]);
          resolve({ store: self, data: _data.sessions})
        });
      } else {
        var _data = decodeData(_eData[self._dbName]);
        resolve({ store: self, data: _data.sessions})
      }
    });
	});
}


Store.prototype.save = function (updateData, id) {
  var self = this;
  return new Promise(function(resolve, reject) {
    chrome.storage.local.get(self._dbName, function (_eData) {
      handleRuntimeError('GET:Store.save', chrome.runtime.lastError);

      var _data = decodeData(_eData[self._dbName]);
	    var sessions = _data.sessions;

	    // If an ID was actually given, find the item and update each property
      if (id) {
        getSession(sessions, id)
          .then(function (session) {
            for (var key in updateData) {
              session[key] = updateData[key];
            }

            _eData[self._dbName] = encodeData(_data);
            chrome.storage.local.set(_eData, function(err) {
              handleRuntimeError('SET:Store.save', chrome.runtime.lastError);
              var _data = decodeData(_eData[self._dbName]);
              resolve(_data.sessions)
            });
          }, function (err) {
            if (err) { console.log(err); }
          });

      } else {
        // Generate an ID
    		updateData.id = new Date().getTime();
    		sessions.push(updateData);

        _eData[self._dbName] = encodeData(_data);
        chrome.storage.local.set(_eData, function(err) {
          handleRuntimeError('SET:Store.save', chrome.runtime.lastError);
          var _data = decodeData(_eData[self._dbName]);
          resolve(_data.sessions)
        });
      }
    });
  });

};


Store.prototype.findAll = function () {
  var self = this;
  return new Promise(function(resolve, reject) {
    chrome.storage.local.get(self._dbName, function (_eData) {
      handleRuntimeError('SET:Store.findAll', chrome.runtime.lastError);
      var _data = decodeData(_eData[self._dbName]);
      resolve(_data.sessions)
    });
  });
};

Store.prototype.remove = function (id) {
  var self = this;
  return new Promise(function(resolve, reject) {
    chrome.storage.local.get(self._dbName, function (_eData) {
      handleRuntimeError('GET:Store.remove', chrome.runtime.lastError);

      var _data = decodeData(_eData[self._dbName]);
	    var sessions = _data.sessions;

      for (var i = 0; i < sessions.length; i++) {
   			if (String(sessions[i].id) === String(id)) {
		      sessions.splice(i, 1);
   				break;
   			}
   		}

      _eData[self._dbName] = encodeData(_data);
      chrome.storage.local.set(_eData, function(err) {
        handleRuntimeError('SET:Store.remove', chrome.runtime.lastError);
        var _data = decodeData(_eData[self._dbName]);
        resolve(_data.sessions)
      });
    });
  });
};

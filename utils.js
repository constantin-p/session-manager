function isFirefox() {
  return /gecko\/\d/i.test(navigator.userAgent);
}

function getDataFromStack(stack, index) {
  // Format: https://github.com/v8/v8/wiki/Stack%20Trace%20API
  var stackRegChrome = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
  var stackRegChrome2 = /at\s+()(.*):(\d*):(\d*)/gi;

  var stackRegFirefox = /@+()(.*):(\d*):(\d*)/gi;

  if (isFirefox()) {
    var stackList = stack.split('\n').slice(1);
    var s = stackList[index] || stackList[0];
    var sp = stackRegFirefox.exec(s);
  } else {
    var stackList = stack.split('\n').slice(2);
    var s = stackList[index] || stackList[0];
    var sp = stackRegChrome.exec(s) || stackRegChrome2.exec(s);
  }

  if (sp && sp.length === 5) {
    var data = {
      method: sp[1],
      line: sp[3],
      pos: sp[4],
      file: sp[2] + ':' + sp[3] + ':' + sp[4]
    }

    return data;
  }
  return null;
};


function handleRuntimeError(src, err) {
  if (err) {
    console.debug('[' + src + ']: ', err.message);
  } else {
    console.debug('[' + src + ']: ', 'SUCCESS');
  }
  console.debug(getDataFromStack(new Error().stack).file)
}

function message(src) {
  var args = arguments;
  args[0] = '[' + src + ']';
  console.debug.apply(console, args);
  console.debug(getDataFromStack(new Error().stack).file)
}

function logError(src) {
  var args = arguments;
  args[0] = '[' + src + ']';
  console.debug.apply(console, args);
  console.debug(getDataFromStack(new Error().stack).file)
}

function err(msg, data) {
  return {
    mag: msg,
    data: data,
    callStack: new Error().stack
  };
}

// Session utils
function getSession(sessions, sessionId) {
  return new Promise(function(resolve, reject) {
    for (var i = 0; i < sessions.length; i++) {
      if (String(sessions[i].id) === String(sessionId)) {
        resolve(sessions[i]);
      }
    }
    reject(err('No session found with the given id. ', { id: sessionId, sessions: sessions }))
  });

}

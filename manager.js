var mold = new Mold();

mold.defs.caps = function(val) { return String(val).toUpperCase() }
mold.defs.classes = function(obj) {
  var className = '';
  for (var variable in obj) {
    if (obj.hasOwnProperty(variable)) {
      if (obj[variable]) {
        className += variable;
      }
    }
  }
  return 'class="$c"'.replace('$c', className);
}

var template = mold.bake("mytemplate", `
<ul class="sessions">
  <<for x $in.sessions>>
    <li>
      <div class="label">
        <span class="session-date"><<t x._date>></span>
        <span class="delete-session" id="d:s-<<t x.id>>"></span>
        <span class="item-count"><<t x._tabsCount>></span>
      </div>
      <ul class="windows">
        <<for y x.data>>
          <li class="<<t y._class>> open-window" id="c:w-<<t x.id>>-<<t $i>>">
            <span class="delete-window" id="d:w-<<t x.id>>-<<t $i>>"></span>
            <ul class="tabs">
              <<for z y.tabs>>
                <li>
                  <span class="icon"><img src="<<t z.favIconUrl>>"></span></span>
                  <span class="title"><<t z.title>></span>
                  <span class="url"><<t z.url>></span>
                </li>
              <</for>>
            </ul>
          </li>
        <</for>>
      </ul>
    </li>
  <</for>>
</ul>`);
var root = document.getElementById('sessions');







function contains(str, match) {
  for (var i = 0; i < match.length; i++) {
    if (str.indexOf(match[i]) !== -1) {
      return true;
    }
  }
  return false;
}

function getNodeFromStr(str) {
  var div = document.createElement('div');
  div.innerHTML = str;
  return div.childNodes[0];
}

function getPaddedTime(str) {
  return ('0' + str).slice(-2);
}

function getDateFromTimestamp(timestamp, format) {
  var date = new Date(timestamp);

  return format
    .replace('YYYY', date.getFullYear())
    .replace('MM', getPaddedTime(date.getMonth() + 1))
    .replace('DD', getPaddedTime(date.getDate()))
    .replace('hh', getPaddedTime(date.getHours()))
    .replace('mm', getPaddedTime(date.getMinutes()))
    .replace('ss', getPaddedTime(date.getSeconds()));
}

function render(data) {
  setSessionDecorations(data);
  root.innerHTML = '';
  root.appendChild(getNodeFromStr(template({ sessions: data })));
  setEventListeners(['open-window', 'delete-window', 'delete-session'], getEventHandler(data));
}

function setEventListeners(classNames, cb) {
  for (var i = 0; i < classNames.length; i++) {
    var nodes = document.getElementsByClassName(classNames[i]);
    for (var j = 0; j < nodes.length; j++) {
      nodes[j].addEventListener('click', cb, false);
    }
  }
}

function getEventHandler(sessions) {
  return function eventHandler(event) {
    event.stopPropagation();
    console.log(event, this.id)

    var locator = this.id.split('-'),
      action = locator[0],
      sessionId = locator[1],
      winIndex = locator[2];

    switch (action) {
      case 'c:w':
        getWindowContent(sessions, sessionId, winIndex)
          .then(function (winData) {
            chrome.windows.create(winData, function (win) {
              message('CREATE:Window', winData, win);
            })
          }, function (err) {
            if (err) { console.log(err); }
          });

        break;
      case 'd:w':
        new Store('session_manager')
          .then(function (args) {
            console.log('INIT DATA', args.data, sessionId, winIndex);

            removeWindowFromSessions(args.data, sessionId, winIndex)
              .then(function (updatedSession) {
                if (updatedSession.data.length === 0) {
                  args.store.remove(sessionId)
                    .then(render, function () {
                      if (err) { console.log(err); }
                    });
                } else {
                  args.store.save(updatedSession, sessionId)
                    .then(render, function () {
                      if (err) { console.log(err); }
                    });
                }
              }, function (err) {
                if (err) { console.log(err); }
              });

          }, function (err) {
            if (err) { console.log(err); }
          });
        break;
      case 'd:s':
        new Store('session_manager')
          .then(function (args) {
            args.store.remove(sessionId)
              .then(render, function () {
                if (err) { console.log(err); }
              });
          }, function (err) {
            if (err) { console.log(err); }
          });
        break;
    }
  }
}

function getWindowContent(sessions, sessionId, winIndex) {
  var data = {
    url: [],
    incognito: false
  };
  return new Promise(function(resolve, reject) {
    getSession(sessions, sessionId)
      .then(function (session) {
        if (session.data[winIndex] && session.data[winIndex].tabs.length > 0) {
          for (var z = 0; z < session.data[winIndex].tabs.length; z++) {
            data.url.push(session.data[winIndex].tabs[z].url);
          }
          data.incognito = session.data[winIndex].incognito;
          resolve(data);
        } else {
          !session.data[winIndex] && reject(err('No window found at the given index.', { index: winIndex, windows: session.data }));
          !(session.data[winIndex].tabs.length > 0) && reject(err('Invalid window (no tabs).', { window: session.data[winIndex] }));
        }
      }, function (err) {
        reject(err('No window found at the given index.', { index: winIndex, windows: session.data }));
      });
  });

  //
  // for (var i = 0; i < sessions.length; i++) {
  //   if (String(sessions[i].id) === String(sessionId)) {
  //     if (sessions[i].data[winIndex] && sessions[i].data[winIndex].tabs.length > 0) {
  //       for (var z = 0; z < sessions[i].data[winIndex].tabs.length; z++) {
  //         data.url.push(sessions[i].data[winIndex].tabs[z].url);
  //       }
  //       data.incognito = sessions[i].data[winIndex].incognito;
  //     }
  //     break;
  //   }
  // }
  // return data;
}


function removeWindowFromSessions(sessions, sessionId, winIndex) {
  return new Promise(function(resolve, reject) {
    getSession(sessions, sessionId)
      .then(function (session) {
        if (session.data[winIndex] && session.data[winIndex].tabs.length > 0) {
          session.data.splice(winIndex, 1);
          resolve(session);
        } else {
          reject(err('No window found at the given index.', { index: winIndex, windows: session.data }));
        }
      }, function (err) {
        reject(err('No window found at the given index.', { index: winIndex, windows: session.data }));
      });
  });
}

function setSessionDecorations(sessions) {
  for (var i = 0; i < sessions.length; i++) {
    var count = 0;
    for (var j = 0; j < sessions[i].data.length; j++) {
      count += sessions[i].data[j].tabs.length;
      sessions[i].data[j]._class = sessions[i].data[j].incognito ? 'incognito' : '';

      for (var z = 0; z < sessions[i].data[j].tabs.length; z++) {
        if (contains(sessions[i].data[j].tabs[z].favIconUrl, [
            'chrome://',
            'chrome-extension://',
          ]) || String(sessions[i].data[j].tabs[z].favIconUrl).length === 0) {
          sessions[i].data[j].tabs[z].favIconUrl = '/img/default_favicon.png'
        }
      }
    }
    sessions[i]._tabsCount = count;
    sessions[i]._date = getDateFromTimestamp(sessions[i].id, 'DD.MM.YYYY hh:mm');
  }
}




function init() {
  new Store('session_manager')
    .then(function (args) {
      args.store.findAll()
        .then(render, function () {
          if (err) { console.log(err); }
        });
    }, function (err) {
      if (err) { console.log(err); }
    });
}

init();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(request, sender, sendResponse);
  switch (request.command) {
    case 'MANAGER:REFRESH':
      console.log("MANAGER:REFRESH");
      init();
      break;
  }
  sendResponse({ status: 'OK' });
});

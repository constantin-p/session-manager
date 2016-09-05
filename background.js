
function extractTabData(windows) {
  var data = [];
  for (var i = 0; i < windows.length; i++) {
    var win = {
      incognito: windows[i].incognito,
      tabs: []
    };
    for (var j = 0; j < windows[i].tabs.length; j++) {
      win.tabs.push({
        title: windows[i].tabs[j].title,
        favIconUrl: windows[i].tabs[j].favIconUrl,
        url: windows[i].tabs[j].url
      });
    }
    data.push(win);
  }
  return {
    data: data
  };
}

function saveCurrentSession() {
  return new Promise(function(resolve, reject) {
    chrome.windows.getAll({
      populate: true,
      windowTypes: ['normal']
    }, function (windows) {

      new Store('session_manager')
        .then(function (args) {
          args.store.save(extractTabData(windows))
            .then(function (session) {
              resolve(session);
            }, reject);
        }, reject);
    });
  });
}

function openManagerPage(info, tab) {
  chrome.tabs.create({
    url: 'main.html'
  });
}

chrome.browserAction.onClicked.addListener(function (tab) {
  saveCurrentSession();
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  switch (info.menuItemId) {
    case 'MANAGER:OPEN':
      openManagerPage(info, tab);
      break;
    case 'MANAGER:SAVE':
      saveCurrentSession()
        .then(function () {
          console.log('==============>  response');
          chrome.runtime.sendMessage({ command: 'MANAGER:REFRESH' }, function(response) {
            console.log(response);
          });
        }, function (err) {
          if (err) { console.log(err); }
        });
      break;
    default:
  }
});


chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({
      'id': 'MANAGER:OPEN',
      'title': 'Open Manager',
      'contexts': ['page', 'browser_action']
    });

    chrome.contextMenus.create({
      'id': 'MANAGER:SAVE',
      'title': 'Save current session',
      'contexts': ['page', 'browser_action']
    });
  });
});

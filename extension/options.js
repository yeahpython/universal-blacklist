// Saves options to chrome.storage.sync.
function save_options() {
  var hide_completely_string = document.getElementById('hide_completely').value;
  var hide_completely_strings = hide_completely_string.split('\n');
  var hide_completely = {};
  hide_completely_strings.forEach(function(element) {
    if (element) {
      hide_completely[element] = true
    }
  });

  var blacklist_string = document.getElementById('blacklist').value;
  var blacklist_strings = blacklist_string.split('\n');
  var blacklist = {};
  blacklist_strings.forEach(function(element) {
    if (element) {
      blacklist[element] = true
    }
  });

  var disable_site_string = document.getElementById('disable_site').value;
  var disable_site_strings = disable_site_string.split('\n');
  var disable_site = {};
  disable_site_strings.forEach(function(element) {
    if (element) {
      disable_site[element] = true
    }
  });

  // var color = document.getElementById('color').value;
  var enabled = document.getElementById('enabled').checked;
  chrome.storage.local.set({
    hide_completely: hide_completely,
    blacklist: blacklist,
    disable_site: disable_site,
    enabled: enabled
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    blacklist: {},
    hide_completely: {},
    disable_site: {},
    enabled: true,
  }, function(items) {
    var hide_completely = items["hide_completely"]
    var hide_completely_array = []
    for (key in hide_completely) {
      if (hide_completely[key] === true) {
        hide_completely_array.push(key);
      }
    }
    document.getElementById('hide_completely').value = hide_completely_array.join('\n');


    var blacklist = items["blacklist"]
    var blacklist_array = []
    for (key in blacklist) {
      if (blacklist[key] === true) {
        blacklist_array.push(key);
      }
    }
    document.getElementById('blacklist').value = blacklist_array.join('\n');
    // document.getElementById('color').value = items.favoriteColor;

    var disable_site = items["disable_site"]
    var disable_site_array = []
    for (key in disable_site) {
      if (disable_site[key] === true) {
        disable_site_array.push(key);
      }
    }
    document.getElementById('disable_site').value = disable_site_array.join('\n');

    document.getElementById('enabled').checked = items.enabled;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }


var b = document.documentElement;
var timer = void 0;
var timeOutRun = void 0;

var pins = [];
var scrolls = [];
var filtered = void 0;
var alt = false;

function makeCounter() {
  var i = 0;
  return function () {
    return i++;
  };
}

var id = makeCounter();

var Pin = function () {
  function Pin(x, y, index, top_scroll) {
    var note = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : "";

    _classCallCheck(this, Pin);

    this.index = index;
    this.pin = document.createElement("div");
    this.pin.style.left = x - 9.5 + "px";
    this.pin.style.top = y - 20 + "px";
    this.pin.classList.add("pin-line-bookmark");
    this.pin.classList.add("bounceIn-line-bookmark");
    this.pin.setAttribute("index", index);
    b.appendChild(this.pin);
    this.pin.addEventListener("click", this, false);
    this.noteDiv = document.createElement("div");
    this.noteDiv.classList.add("note-line-bookmark");
    this.pin.appendChild(this.noteDiv);

    this.noteText = document.createElement("div");
    this.noteText.classList.add("noteText-line-bookmark");
    this.noteText.setAttribute("contenteditable", "true");
    this.noteText.setAttribute("placeholder", "Write a note...");
    this.noteText.innerHTML = note;
    this.noteText.addEventListener("keyup", this, false);
    this.noteDiv.appendChild(this.noteText);

    this.top_scroll = top_scroll;
    this.x = x;
    this.y = y;
    this.note = note;
    this.scroll_from = false;
  }

  _createClass(Pin, [{
    key: "handleEvent",
    value: function handleEvent(e) {
      switch (e.type) {
        case "click":
          this.click(e);
          break;
        case "keyup":
          this.keyUp(e);

      }
    }
  }, {
    key: "click",
    value: function click(e) {
      var _this = this;

      if (alt === false) {
        this.noteDiv.classList.add("fadeInUp-line-bookmark");
        this.noteDiv.classList.remove("fadeOutDown-line-bookmark");
      }

      this.noteText.addEventListener("focus", function () {

        _this.noteText.parentElement.classList.add("hoverShadow-line-bookmark");
      });
      this.noteText.addEventListener("blur", function () {
        _this.noteText.parentElement.classList.remove("hoverShadow-line-bookmark");
      });
      savePins();
    }
  }, {
    key: "keyUp",
    value: function keyUp(e) {
      var _this2 = this;

      delay(function () {
        _this2.note = _this2.noteText.innerHTML;
        savePins();
      }, 1000);
    }
  }, {
    key: "Top",
    value: function Top() {
      return this.top_scroll;
    }
  }, {
    key: "X",
    value: function X() {
      return this.x;
    }
  }, {
    key: "Y",
    value: function Y() {
      return this.y;
    }
  }, {
    key: "scrollFromPin",
    value: function scrollFromPin() {
      this.scroll_from = true;
    }
  }, {
    key: "removeScrollFromPin",
    value: function removeScrollFromPin() {
      this.scroll_from = false;
    }
  }, {
    key: "getScrollFrom",
    value: function getScrollFrom() {
      return this.scroll_from;
    }
  }, {
    key: "removeElement",
    value: function removeElement() {
      this.pin.remove();
    }
  }]);

  return Pin;
}();

b.addEventListener("click", function (e) {
  var x = e.pageX;
  var y = e.pageY;
  var near = false;

  for (var i = pins.length - 1; i >= 0; i--) {
    if (pins[i] != -1) {
      var pinX = pins[i].X();
      var pinY = pins[i].Y();
      var R = Math.sqrt(Math.pow(Math.abs(x - pinX), 2) + Math.pow(Math.abs(y - pinY), 2));

      if (R < 10) {
        near = true;

        break;
      }
    }
  }
  if (alt === true) {
    if (e.target.classList.contains("pin-line-bookmark")) {
      e.target.classList.add("remove-pin-line-bookmark");
      setTimeout(function () {

        var indexValue = e.target.getAttribute("index");
        var index = void 0;

        for (var i = pins.length - 1; i >= 0; i--) {
          if (pins[i].index == indexValue) {

            index = i;
            pins.splice(i, 1);

            break;
          }
        }
        e.target.remove();
        var pinElements = document.querySelectorAll(".pin-line-bookmark");

        var checkTrue = false;
        for (i = 0; i < pins.length; i++) {
          if (pins[i].getScrollFrom() == true) {
            checkTrue = true;
            break;
          }
        }
        if (checkTrue == false) {
          if (pins[index]) {
            pins[index].scrollFromPin();
          } else if (pins[index - 1]) {
            pins[index - 1].scrollFromPin();
          } else if (pins[index + 1]) {
            pins[index + 1].scrollFromPin();
          } else {
            pins = [];
          }
        }

        filtered = filterPins();

        savePins();
      }, 450);
    } else {
      if (near == false && !e.target.classList.contains("noteText-line-bookmark") && !e.target.classList.contains("note-line-bookmark")) {

        var _pin = new Pin(x, y, id(), b.scrollTop);
        pins.push(_pin);

        for ( i = 0; i < pins.length; i++) {
          if (pins[i].Top() == pins[pins.length - 1].Top()) {
            pins[i].scrollFromPin();
          } else {
            pins[i].removeScrollFromPin();
          }
        }

        sortPins(pins);
        filtered = filterPins();
        savePins();
      }
    }
  }
});

b.addEventListener("mouseup", function (e) {

  if (!e.target.classList.contains("pin-line-bookmark") && !e.target.classList.contains("note-line-bookmark") && !e.target.classList.contains("noteText-line-bookmark")) {

    var noteDiv = document.querySelectorAll(".note-line-bookmark");
    for (var i = 0; i < noteDiv.length; i++) {
      var note = noteDiv[i];
      note.classList.remove("fadeInUp-line-bookmark");
      note.classList.add("fadeOutDown-line-bookmark");
    }
  }
});

var reOrder = function reOrder(els) {
  var i = 0;
  for (i; i < els.length; i++) {
    els[i].setAttribute("index", i);
  }
};

var noteText = document.querySelectorAll(".noteText-line-bookmark");

var _loop = function _loop() {
  var noteEl = noteText[i];
  noteEl.addEventListener("focus", function () {

    noteEl.parentElement.classList.add("hoverShadow-line-bookmark");
  });
  noteEl.addEventListener("blur", function () {
    noteEl.parentElement.classList.remove("hoverShadow-line-bookmark");
  });
};

for (var i = 0; i < noteText.length; i++) {
  _loop();
}

b.addEventListener("keyup", function (e) {

  alt = false;
});
b.addEventListener("keydown", function (e) {

  if (e.altKey == true) {
    alt = true;
  }
  if (e.keyCode == 88 && e.ctrlKey == true && e.target.tagName != "INPUT" && e.target.tagName != "TEXTAREA") {
    if (pins.length > 0) {
      var index = void 0;
      for (var i = 0; i < filtered.length; i++) {
        if (filtered[i].getScrollFrom() == true) {
          index = i;
          break;
        }
      }

      var comingIndex = void 0;
      if (index == 0) {
        comingIndex = filtered.length - 1;
      } else {
        comingIndex = index - 1;
      }
      b.scrollTop = filtered[comingIndex].Top();
      for (i = 0; i < pins.length; i++) {
        if (pins[i].Top() == filtered[comingIndex].Top()) {
          pins[i].scrollFromPin();
        } else {
          pins[i].removeScrollFromPin();
        }
      }
    }
  }
});
var sortPins = function sortPins(arr) {

  arr.sort(function (a, b) {
    return a.Top() - b.Top();
  });
};

function filterPins() {
  var uniqIds = {};
  var filtered = pins.filter(function (obj) {
    return !uniqIds[obj.Top()] && (uniqIds[obj.Top()] = true);
  });
  return filtered;
}

var delay = function () {
  var timer = 0;
  return function (callback, ms) {
    clearTimeout(timer);
    timer = setTimeout(callback, ms);
  };
}();
var savePins = function savePins() {
  localStorage.setItem(window.location.href, JSON.stringify(pins));
  var storageItem = JSON.parse(localStorage.getItem(window.location.href)).length;
  if (storageItem === 0) {
    localStorage.removeItem(window.location.href);
  }
};
var storage = localStorage.getItem(window.location.href);
if (storage !== null) {
  storage = JSON.parse(storage);
  for (var i = 0; i < storage.length; i++) {
    var p = storage[i];
    var pin = new Pin(p.x, p.y, id(), p.top_scroll, p.note);
    pin.scroll_from = p.scroll_from;
    pins.push(pin);
    filtered = filterPins();
  }
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  var pinStatus = void 0;
  var storage = localStorage.getItem(window.location.href);

  if (storage !== null) {
    pinStatus = "full";
  } else {
    pinStatus = "empty";
  }
  switch (message.type) {
    case "getStatus":
      sendResponse(pinStatus);

      break;
    case "remove":
      removePins();
      sendResponse("done");

      break;
    default:
      console.error("Unrecognised message: ", message);
  }
});

var removePins = function removePins() {
  for (var i = 0; i < pins.length; i++) {
    pins[i].removeElement();
  }
  pins = [];
  localStorage.removeItem(window.location.href);
};

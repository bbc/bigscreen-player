import Chronicle from "./chronicle";
import DebugPresenter from "./debugpresenter";
import DebugView from "./debugview";

function DebugTool() {
  var presenter = DebugPresenter;
  var view;
  var visible = false;

  var staticFieldValues = {};

  function toggleVisibility() {
    if (visible) {
      hide();
    } else {
      show();
    }
  }

  function show() {
    view = DebugView;
    view.init();
    presenter.init(view);
    Chronicle.registerForUpdates(presenter.update);
    visible = true;
  }

  function hide() {
    presenter.tearDown();
    view.tearDown();
    Chronicle.unregisterForUpdates(presenter.update);
    visible = false;
  }

  function updateKeyValue(message) {
    var staticFieldValue = staticFieldValues[message.key];

    if (staticFieldValue) {
      var entry = Chronicle.retrieve()[staticFieldValue.index];
      if (entry) {
        entry.keyvalue = message;
      }
    } else {
      staticFieldValues[message.key] = {
        value: message.value,
        index: Chronicle.retrieve().length
      };
      Chronicle.keyValue(message);
    }
  }

  function tearDown() {
    staticFieldValues = {};
  }

  return {
    toggleVisibility: toggleVisibility,
    info: Chronicle.info,
    error: Chronicle.error,
    event: Chronicle.event,
    time: Chronicle.time,
    apicall: Chronicle.apicall,
    keyValue: updateKeyValue,
    tearDown: tearDown
  };
}

var instance;

if (instance === undefined) {
  instance = new DebugTool();
}

export default instance;

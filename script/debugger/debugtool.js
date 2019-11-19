define('bigscreenplayer/debugger/debugtool',
  [
    'bigscreenplayer/debugger/chronicle',
    'bigscreenplayer/debugger/debugpresenter',
    'bigscreenplayer/debugger/debugview'
  ],
 function (Chronicle, DebugPresenter, DebugView) {
   'use strict';
   function DebugTool () {
     var rootElement;
     var presenter = DebugPresenter;
     var view;
     var visible = false;

     var staticFieldValues = {};

     function toggleVisibility () {
       if (visible) {
         hide();
       } else {
         show();
       }
     }

     function show () {
       view = DebugView;
       view.setRootElement(rootElement);
       view.init();
       presenter.init(view);
       presenter.update(Chronicle.retrieve());
       Chronicle.registerForUpdates(presenter.update);
       visible = true;
     }

     function hide () {
       view.tearDown();
       Chronicle.unregisterForUpdates(presenter.update);
       visible = false;
     }

     function updateKeyValue (message) {
       var staticFieldValue = staticFieldValues[message.key];

       if (staticFieldValue) {
         var entry = Chronicle.retrieve()[staticFieldValue.index];
         if (entry) {
           entry.keyvalue = message;
         }
       } else {
         staticFieldValues[message.key] = {value: message.value, index: Chronicle.retrieve().length};
         Chronicle.keyValue(message);
       }
     }

     function setRootElement (element) {
       rootElement = element;
     }

     function tearDown () {
       staticFieldValues = {};
       hide();
     }

     return {
       toggleVisibility: toggleVisibility,
       setRootElement: setRootElement,
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

   return instance;
 });

define('bigscreenplayer/debugger/debugtool',
  [
    'bigscreenplayer/debugger/chronicle',
    'bigscreenplayer/debugger/debugpresenter',
    'bigscreenplayer/debugger/debugview'
  ],
 function (Chronicle, DebugPresenter, DebugView) {
   'use strict';
   function DebugTool () {
     var presenter = DebugPresenter;
     var view;
     var visible = false;

     var LOG_LEVELS = {
       ERROR: 0,
       DEBUG: 1,
       INFO: 2,
       VERBOSE: 3
     };

     var logLevel = LOG_LEVELS.VERBOSE;

     var staticFieldValues = {};

     function toggleVisibility () {
       if (visible) {
         hide();
       } else {
         show();
       }
     }

     function setLogLevel (newLogLevel) {
       var level = LOG_LEVELS[logLevel];
       if (level) {
         logLevel = newLogLevel;
       }
     }

     function show () {
       view = DebugView;
       view.init();
       presenter.init(view);
       presenter.update(Chronicle.retrieve());
       Chronicle.registerForUpdates(presenter.update);
       visible = true;
     }

     function hide () {
       presenter.tearDown();
       view.tearDown();
       Chronicle.unregisterForUpdates(presenter.update);
       visible = false;
     }

     function info (log) {
       if (logLevel >= LOG_LEVELS.INFO) {
         Chronicle.info(log);
       }
     }

     function event (log) {
       if (logLevel >= LOG_LEVELS.ERROR) {
         Chronicle.event(log);
       }
     }

     function time (log) {
       if (logLevel >= LOG_LEVELS.ERROR) {
         Chronicle.time(log);
       }
     }

     function error (log) {
       if (logLevel >= LOG_LEVELS.ERROR) {
         Chronicle.error(log);
       }
     }

     function verbose (log) {
       if (logLevel >= LOG_LEVELS.VERBOSE) {
         Chronicle.verbose(log);
       }
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

     function tearDown () {
       staticFieldValues = {};
     }

     return {
       toggleVisibility: toggleVisibility,
       setLogLevel: setLogLevel,
       getLogLevels: LOG_LEVELS,
       verbose: verbose,
       info: info,
       error: error,
       event: event,
       time: time,
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

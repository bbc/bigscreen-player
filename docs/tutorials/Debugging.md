During development, `bigscreen-player` offers a form of debugging with an on-screen debugger. Using this tool, specific events can be monitored to check successful execution of the program logic. This is particularly useful where no native JS consoles are accessible on certain devices.

### The Chronicle
The debug-tool latches on top of the `chronicle` which acts similarly to the plugin interface. It has a reference to all of the callbacks that need to be updated upon a debug event occurring. 

This could allow for a possible extension of the debugging interface *if* needed.

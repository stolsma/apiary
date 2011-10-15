
## Logging channels


### Event channel

`event::[subsystem]::[event], [arguments]` or
`event::[subsystem]::[name]::[event], [arguments]`

`[subsystem]` can be one off:

 * `sc`        System Controller Events
 * `sre`       Service Resource Environment events
 * `sse`       System Service Environment events
 * `apie`      API Environment events
 * `srec`      Service Resource Environment Controller events
 * `ss`        System Service events
 * `apis`      API Service events
 
`[name]` is only available on `srec`, `ss` and `apis` subsystem events and is the name of the targeted service eventstream.

`[event]` is the eventstream going through the 


### Log channel

`log::[subsystem], [description], [meta-object]` or
`log::[subsystem]::[name]`

`[subsystem]` can be one off:

 * `sc`        System Controller Events
 * `sre`       Service Resource Environment events
 * `sse`       System Service Environment events
 * `apie`      API Environment events
 * `srec`      Service Resource Environment Controller events
 * `ss`        System Service events
 * `apis`      API Service events
 
`[name]` is only available on `srec`, `ss` and `apis` subsystem log events and is the name of the targeted service log stream.


### Exception channel

`exception::[process]` or
`exception::[process]::[name]`

`[process]` can be one off:

 * `apiary`    System Controller process exceptions
 * `srec`      Service Resource Environment process exceptions
 * `ss`        System Service process exceptions
 * `apis`      API Service process exceptions
 
`[name]` is only available on `srec`, `ss` and `apis` process exceptions streams and is the name of the targeted service process.

function PluginData (args) {
  this.status = args.status
  this.stateType = args.stateType
  this.isBufferingTimeoutError = args.isBufferingTimeoutError || false
  this.isInitialPlay = args.isInitialPlay
  this.cdn = args.cdn
  this.newCdn = args.newCdn
  this.timeStamp = new Date(),
  this.code = args.code,
  this.message = args.message
}

export default PluginData

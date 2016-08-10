var SecureUrl = require('./fetch')
var u = require('./util')

module.exports = function (prefix, store, log) {
  var appname = prefix
  var wb, running = false

  //destroy everything
  function scorchedEarth () {
    for(var k in localStorage) {
      delete localStorage[k]
    }
  }
  function onProgress (ev) {
    wb.onprogress && wb.onprogress(ev)
  }

  var init = '#'+appname+'_INIT'

  return wb = {
    scorchedEarth: scorchedEarth,
    isInit: function () {
      return location.hash.substring(0, init.length) === init
    },
    setup: function () {
      if(!wb.isInit())
      location.hash = init + location.hash
      location.reload()
    },
    reinitialize: function (cb) {
      delete localStorage[appname+'_current']
      store.destroy(cb)
    },
    install: function (url, cb) {
      onProgress('installing from:'+url)
      var id = SecureUrl.isSecureUrl(url)
      if(!id) return cb(new Error('not a secure url:'+url))
      //check whether we already have this
      //before downloading anything
      store.get(id, function (err, data) {
        if(!err) return cb(null, data, id)
        SecureUrl(url, function (err, data, id) {
          if(err) cb(err)
          else store.add(data, id, function (err) {
            cb(err, data, id)
          })
        })
      })
    },
    installAndRun(url, cb) {
      wb.install(url, function (err, _, id) {
        if(err) cb(err)
        else wb.run(id, cb)
      })
    },
    add: store.add,
    run: function (id, cb) {
      if(!id) return cb(new Error('WebBoot.run: id must be provided'))
      var _id
      //if we are already running, restart
      //clear out init code, if we are in setup mode
      if(wb.isInit())
        location.hash = location.hash.substring(init.length)

      log.head(function (err, data) {
        if(err) return cb(err)
        if(data) _id = data.value
        if(_id === id)
          run(id)
        else
          log.append(id, function (err) {
            if(err) return cb(err)
            run(id)
          })
      })

      function run (id) {
        if(running) {
          //reload, and then the current version will trigger.
          cb()
          location.reload()
        }
        else
          store.get(id, function (err, data) {
            if(err) return cb(err)
            var script = document.createElement('script')
            running = true
            script.textContent = u.toUtf8(data)
            document.head.appendChild(script) //run javascript.
            cb()
          })
      }
    },
    version: require('./package.json').version,
    remove: store.rm,
    has: store.has,
    versions: log.filtered,
    history: log.unfiltered,
    current: log.head,
    append: log.append,
    revert: log.revert,
    onprogress: null
  }
}




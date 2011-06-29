option '-p', '--production', 'Build for production'

task 'build', 'Build application', (options) ->
  process = require('child_process')
  process.exec "coffee --join lib/css-guide.js --compile src/CssGuide.coffee"
  if options.production?
    files = ["lib/jquery-1.6.1.js", "lib/jquery.tmpl.js", "lib/css-guide.js", "lib/application.js"]
    process.exec "cat #{files.join(' ')} | uglifyjs > app/application.min.js"
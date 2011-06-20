option '-f', '--file [file]', 'filename for compiled code'

task 'build', 'Build application', (options) ->
  require('child_process').exec "coffee --print --compile CssGuide.coffee | uglifyjs > #{options.file || 'application'}.js"
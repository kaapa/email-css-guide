option '-f', '--file [file]', 'filename for compiled code'

filename = (options) ->
 "#{options.file || 'application'}.js"

task 'build', 'Build application', (options) ->
  require('child_process').exec "coffee --join #{filename options} --compile CssGuide.coffee"

task 'Minify', 'Minify application.js (requires uglify-js)', (options) ->
  require('child_process').exec "cat #{filename options} | uglifyjs > #{filename options}"

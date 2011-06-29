exports = window unless exports?
#
# CssGuide parses HTML documents against a set of tests and returns
#
class exports.CssGuide
  # Returns all elements that exist in both arrays
  @intersection: (a, b) ->
    a.filter (n) -> b.indexOf(n) == -1

  # Trim whitespace around input string
  @trim: (string) ->
    string.replace(/^\s*/, "").replace(/\s*$/, "");

  #
  # Parser parses document's CSS definitions into tokens
  #
  class CssGuide.Parser
    constructor: (@engine, dom) ->
      # An array of token objects. A token contains a selector which can be
      # either a HTMLElement object or a string CSS selector. Besides selector
      # it also contains all the CSS rules for that selector.
      #
      # Structure:
      # 
      # { 
      #   selector: (string | HTMLElement), 
      #   css: { (css-property-name): (css-property-value), ... }
      # }
      @tokens = []

      # Tokenize style sheets
      for sheet in dom.styleSheets
        for rule in sheet.cssRules
          @tokens.push
            selector: rule.selectorText
            css: @parseCssText rule.style.cssText

      # Tokenize inline CSS
      for node in @engine("[style]", dom) when "" != @engine(node).attr "style"
          @tokens.push
            selector: node
            css: @parseCssText @engine(node).attr "style"

    # Find a token by name of a CSS property
    findByProperty: (properties...) ->
      tokens = []
      for property in properties
        for token in @tokens when token.css[property] != undefined
          tokens.push token if -1 is tokens.indexOf(token)
      tokens

    findBySelector: (selector) ->
      selector = new RegExp("\b#{ selector }\b") unless selector instanceof RegExp
      token.selector for token in @tokens when token.selector instanceof String and token.selector.match(selector)

    parseCssText: (text) ->
      css = {}
      for definition in text.split(";")
        unless definition is ""
          [property, value] = definition.split(":")
          if property?
            css[CssGuide.trim property] = if value? then CssGuide.trim value else ""
      css

  class CssGuide.Suite
    # registry is an array of test definition objects.
    #
    # Structure:
    # 
    # { 
    #   description: (string),
    #   clients: (array),
    #   callback: (function)
    # }
    @registry = []

    # Store a test definition into the registry
    @defineTest: (definition) ->
      @registry.push definition

    constructor: (@engine) ->

    # Create a blank HTML document and inject input to it
    createDocument: (input) ->
        @engine("iframe").remove();
        @engine('<iframe name="tokenizer" style="display:none;"></iframe>').appendTo(window.document.body);

        unless input.match /<html[^>]*>/
          unless input.match /<body[^>]*>/
            input = "<body>#{input}</body>"
          input = "<html>#{input}</html>"

        window.frames.tokenizer.document.write input
        window.frames.tokenizer.document

    # Execute tests related to the requested clients against the provided HTML document 
    execute: (input, clients, seed = 0) ->
      # Brand all elements with a unique id for later pairing with the tested
      # document object. Pairing is required because using the original input
      # quarantees preserved source code formatting (line-endings and indentation)
      input = input.replace /<(?!\/)([^>]+)>/gi, (all, match) ->
        '<' + match + ' data-node-id="' + (seed++) + '">'

      # Sanitize markup before injecting to the document
      markup = input.replace(
        /type="(text\/javascript)"/g, 
        'type="text/disabled-javascript"'
      )
      
      dom = @createDocument markup

      parser = new CssGuide.Parser @engine, dom

      for test, id in @constructor.registry when CssGuide.intersection(test.clients, clients).length
        for matches in test.callback(@engine, dom, parser) || []
          matches = [matches] unless matches instanceof Array
          for match in matches
            meta = if @engine(match).attr('data-match-id') then @engine(match).attr('data-match-id') + ' ' + id else id
            @engine(match).attr('data-match-id', meta)

      markup = dom.documentElement.innerHTML

      # Copy the data-match-id attributes created by the test suite to original 
      # source code using data-node-id as identifier in the pairing. 
      # Using the original input quarantees preserved formatting (line-endings and
      # indentation)
      for match in (markup.match /<[^>]+data-match-id="[^"]+"[^>]*>/gi) || [] when match?
        nid = match.match(/data-node-id="([^"]+)"/i)?[1]
        mid = match.match(/data-match-id="([^"]+)"/i)?[1]
        input = input.replace(
          new RegExp('data-node-id="' + nid + '"'), 
          'data-match-id="' + mid + '"'
        )
      
      # Clean up any remaining data-node-id attributes
      input = input.replace /\sdata-node-id="[^"]+"/gi, ""
      
      # Wrap matched elements in a span to highlight the matches
      input = input.replace(
        /<([^>]+?)\s?data-match-id="([^"]+)"([^>]*)>/gi, 
        '{span class="match" data-match-id="$2"}<$1$3>{/span}'
      )
      
      # Escape the input before injecting to the table
      input = jQuery("<div/>").text(input).html()
      
      # After document is escaped the highlight wrappers can be transformed to
      # real DOM nodes
      input = input.replace(
        new RegExp('{span class="match" data-match-id="([^"]+)"}(.+?){\/span}', "g"),
        '<span class="match" data-match-id="$1">$2</span>'
      )

    getClient: (id) ->
      id: id
      name: @constructor.clients[id].name
      share: @constructor.clients[id].share?
      type: @constructor.clients[id].type

    getClients: ->
      clients = (@getClient(id) for id of @constructor.clients)
      clients.sort (a, b) ->
        [a, b] = [a.name.toLowerCase(), b.name.toLowerCase()]
        if a < b then -1
        else if a > b then 1
        else 1

    getClientsCategorized: ->
      categories =
        desktop: []
        mobile: []
        web: []
      for client in @getClients()
        categories[client.type].push(client)
      categories

    getTest: (id) ->
      @constructor.registry[id]

  class CssGuide.EmailSuite extends CssGuide.Suite
    @clients =
      hotmail:
        name: "Windows Live Hotmail"
        type: "web"
        share: 0.17

      yahoo:
        name: "Yahoo! Mail Beta"
        type: "web"
        share: 0.13

      gmail:
        name: "Gmail"
        type: "web"
        share: 0.05

      aol:
        name: "AOL Mail"
        type: "web"

      outlook_2011_mac:
        name: "Outlook 2011 (Mac)"
        type: "desktop"

      outlook_10:
        name: "Outlook '07 / '10"
        type: "desktop"
        share: 0.9

      outlook_03:
        name: "Outlook '03 / Express / Mail"
        type: "desktop"
        share: 0.36

      apple_mail_4:
        name: "Apple Mail 4"
        share: 0.04
        type: "desktop"

      entourage_2008:
        name: "Entourage 2008"
        type: "desktop"

      notes_7:
        name: "Notes 6 / 7"
        type: "desktop"

      notes_8:
        name: "Lotus Notes 8.5"
        type: "desktop"
        share: 0.004

      aol_10:
        name: "AOL Desktop 10"
        type: "desktop"
        share: 0.012

      thunderbird_2:
        name: "Thunderbird 2"
        type: "desktop"
        share: 0.024

      ios_4:
        name: "iPhone iOS 4 / iPad"
        type: "mobile"
        share: 0.04

      blackberry_6:
        name: "Blackberry 6"
        type: "mobile"

      android_gingerbread:
        name: "Android 2.3 (Default mail)"
        type: "mobile"

      android_gingerbread_gmail:
        name: "Android 2.3 (Gmail)"
        type: "mobile"

      windows_mobile_7:
        name: "Windows Mobile 7"
        type: "mobile"

      webos_2:
        name: "HP webOS 2"
        type: "mobile"

    # HTML elements #

    @defineTest
      description: "Does not support <style> element within <head>"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "gmail", "notes_7", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        $("head style", dom)

    @defineTest
      description: "Does not support <style> element within <body>"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "gmail", "notes_7", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        $("body style", dom)

    @defineTest
      description: "Does not support <link> element within <head>"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "aol", "notes_7", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        $("head link", dom)

    @defineTest
      description: "Does not support <link> element within <body>"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "aol", "notes_7", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        $("body link", dom)

    @defineTest
      description: "Does not support <frameset> element"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_10", "outlook_2011_mac" ]
      callback: ($, dom, parser) ->
        $("frameset", dom)

    @defineTest
      description: "Does not support <frame> element"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_10", "outlook_2011_mac" ]
      callback: ($, dom, parser) ->
        $("frame", dom)

    # HTML attributes #

    @defineTest
      description: "Does not support 'cols' attribute on <textarea> elements"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_10", "outlook_2011_mac" ]
      callback: ($, dom, parser) ->
        $("textarea[cols]", dom)

    @defineTest
      description: "Does not support 'colspan' attribute on table cells"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_10", "outlook_2011_mac" ]
      callback: ($, dom, parser) ->
        $("td[colspan], th[colspan]", dom)

    @defineTest
      description: "Does not support 'rowspan' attribute on table cells"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_10", "outlook_2011_mac" ]
      callback: ($, dom, parser) ->
        $("td[rowspan], th[rowspan]", dom)

    # CSS selectors #

    @defineTest
      description: "Does not support * CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "aol", "outlook_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /\*/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "gmail", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /\b[a-z1-9]\b/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support [attribute] CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /\[[a-z0-9_-]+\]/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support [attribute='value'] CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /\[[a-z0-9_-]+=[^\]]+\]/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support [attribute='value'] CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /\[[a-z0-9_-]+=[^\]]+\]/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support [attribute~='value'] CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /\[[a-z0-9_-]+~=[^\]]+\]/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support [attribute^='value'] CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /\[[a-z0-9_-]+^=[^\]]+\]/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support [attribute$='value'] CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /\[[a-z0-9_-]+\$=[^\]]+\]/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support [attribute*='value'] CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /\[[a-z0-9_-]+\*=[^\]]+\]/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:nth-child(n) CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:nth-child/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:nth-last-child(n) CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:nth-last-child/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:nth-of-type(n) CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:nth-of-type/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:nth-last-of-type(n) CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:nth-last-of-type/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:first-child CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:first-child/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:last-child CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:last-child/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:first-of-type CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:first-of-type/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:last-of-type CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:last-of-type/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:empty CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:empty/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:link CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:link/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:visited CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "gmail", "aol", "outlook_2011_mac", "outlook_03", "apple_mail_4", "entourage_2008", "notes_7", "thunderbird_2", "android_gingerbread_gmail", "windows_mobile_7", "webos_2" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:visited/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:active CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "gmail", "outlook_10", "notes_7", "ios_4", "blackberry_6", "android_gingerbread", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:active/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:hover CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "gmail", "outlook_10", "notes_7", "ios_4", "blackberry_6", "android_gingerbread", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:hover/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:focus CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "aol", "outlook_2011_mac", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread", "android_gingerbread_gmail", "windows_mobile_7", "webos_2" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:focus/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:target CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "aol", "outlook_2011_mac", "outlook_10", "outlook_03", "apple_mail_4", "entourage_2008", "notes_7", "notes_8", "aol_desktop_10", "thunderbird_2", "ios_4", "blackberry_6", "android_gingerbread", "android_gingerbread_gmail", "windows_mobile_7", "webos_2" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:target/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:first-line CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "gmail", "outlook_10", "thunderbird_2", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:first-line/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:first-letter CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "gmail", "outlook_10", "thunderbird_2", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:first-letter/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:before CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:before/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:after CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /:after/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E.class CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "gmail", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector /\./
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E#id CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "gmail", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector  /#/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E:not(s) CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector  /:not\(/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E F CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "gmail", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector  /\w\s\w/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E > F CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "gmail", "aol", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "blackberry_6", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector  />/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E + F CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "gmail", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector  /\s\+\s/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support E - F CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        selectors = parser.findBySelector  /\s\-\s/i
        $(selectors.join(", "), dom) if selectors.length > 0

    # CSS properties #

    @defineTest
      description: "Does not support direction CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "outlook_10", "notes_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("direction")
          $(token.selector, dom)

    @defineTest
      description: "Does not support font CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "notes_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("font")
          $(token.selector, dom)

    @defineTest
      description: "Does not support font-family CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("font-family")
          $(token.selector, dom)

    @defineTest
      description: "Does not support font-style CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("font-style")
          $(token.selector, dom)

    @defineTest
      description: "Does not support font-variant CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "notes_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("font-variant")
          $(token.selector, dom)

    @defineTest
      description: "Minimum font-size is 13px"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "ios_4" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("font-size")
          $(token.selector, dom) unless parseInt(token.css["font-size"]) < 13

    @defineTest
      description: "Does not support font-size CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry_6" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("font-size")
          $(token.selector, dom)

    @defineTest
      description: "Does not support font-weight CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("font-weight")
          $(token.selector, dom)

    @defineTest
      description: "Does not support letter-spacing CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "notes_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("letter-spacing")
          $(token.selector, dom)

    @defineTest
      description: "Does not support line-height CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "notes_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("line-height")
          $(token.selector, dom)

    @defineTest
      description: "Does not support text-align CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-align")
          $(token.selector, dom)

    @defineTest
      description: "Does not support text-decoration CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-decoration")
          $(token.selector, dom)

    @defineTest
      description: "Does not support text-indent CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "notes_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-indent")
          $(token.selector, dom)

    @defineTest
      description: "Does not support text-overflow CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "outlook_10", "notes_7", "thunderbird_2", "blackberry_6", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-overflow")
          $(token.selector, dom)

    @defineTest
      description: "Firefox does not support text-overflow: ellipsis"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "aol" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-overflow")
          $(token.selector, dom) if token.css["text-overflow"] == "ellipsis"

    @defineTest
      description: "Does not support text-shadow CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "thunderbird_2", "windows_mobile_7", "webos_2" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-shadow")
          $(token.selector, dom)

    @defineTest
      description: "Internet Explorer does not support text-shadow CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "yahoo", "gmail", "aol" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-shadow")
          $(token.selector, dom)

    @defineTest
      description: "Does not support text-transform CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "notes_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-transform")
          $(token.selector, dom)

    @defineTest
      description: "Does not support white-space CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "outlook_03", "notes_7", "notes_8", "aol_desktop_10" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("white-space")
          $(token.selector, dom)

    @defineTest
      description: "Does not support word-spacing CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "outlook_10", "notes_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("word-spacing")
          $(token.selector, dom)

    @defineTest
      description: "Does not support word-wrap CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "gmail", "outlook_10", "notes_7", "thunderbird_2", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("word-wrap")
          $(token.selector, dom)

    @defineTest
      description: "Does not support word-wrap: normal"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "outlook_03", "notes_8", "aol_desktop_10" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-overflow")
          $(token.selector, dom) if token.css["word-wrap"] == "normal"

    @defineTest
      description: "Does not support vertical-align CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "outlook_10", "notes_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("vertical-align")
          $(token.selector, dom)

    @defineTest
      description: "Does not support color CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("color")
          $(token.selector, dom)

    @defineTest
      description: "Does not support background CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "notes_7", "notes_8" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("background")
          $(token.selector, dom)

    @defineTest
      description: "Does not support background CSS property with images"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "gmail", "outlook_10", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("background")
          $(token.selector, dom) if token.css["background"].match /url\([^)]+\)/gi

    @defineTest
      description: "Does not support background-color CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "notes_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("background-color")
          $(token.selector, dom)

    @defineTest
      description: "Does not support background-image CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "gmail", "outlook_10", "notes_7", "notes_8", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("background-image")
          $(token.selector, dom)

    @defineTest
      description: "Does not support background-position CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "gmail", "outlook_10", "notes_7", "notes_8", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("background-position")
          $(token.selector, dom)

    @defineTest
      description: "Does not support background-repeat CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "hotmail", "gmail", "outlook_10", "notes_7", "notes_8", "android_gingerbread_gmail", "windows_mobile_7" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("background-repeat")
          $(token.selector, dom)


    ###
    @defineTest
      description: "Does not support 'text-shadow' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-shadow")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'text-transform' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("text-transform")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'white-space' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("white-space")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'word-spacing' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("word-spacing")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'word-wrap' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("word-wrap")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'vertical-align' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("vertical-align")
          $(token.selector, dom)
    ###

    @defineTest
      description: "Does not support padding CSS property on <div> and <p> elements"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_10" ]
      callback: ($, dom, parser) ->
        for token in parser.findByProperty("padding", "padding-top", "padding-right", "padding-bottom", "padding-left")
          $(token.selector, dom).filter "p, div"

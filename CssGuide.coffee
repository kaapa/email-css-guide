exports = window unless exports?
#
# CssGuide parses HTML documents against a set of tests and returns
#
class exports.CssGuide
  # Returns all elements that exist in both arrays
  @intersection: (a, b) ->
    (element for element in a when -1 < jQuery.inArray(element, b))

  # Trim whitespace around input string
  @trim: (string) ->
    string.replace(/^\s*/, "").replace(/\s*$/, "");

  #
  # Binds UI elements to events
  #
  class CssGuide.Controller
    constructor: (@suite, @form, @table, @tooltip) ->
      div = $("div:nth-child(2)", @form)      
      template = $("[name='client[]']").closest("label").remove()
      for id, client of @suite.getClients()
        div.append template.clone().append(client.name).find("input").attr("checked", client.share?).val(id).end()

      $("[data-match-id]").live "mouseenter", (e) =>
        description = []
        position = $(e.target).position()
        for id in $(e.target).attr("data-match-id").split(" ")
          description.push @suite.getTest(id).description
          $("[data-match-id~='#{ id }']").addClass("highlight")
        @tooltip.text description.join("\n\n")
        @tooltip.css
          display: "block"
          top: "#{position.top + 5}px",
          left: position.left

      $("[data-match-id]").live "mouseleave", (e) =>
        @tooltip.css "display", "none"
        for id in $(e.target).attr("data-match-id").split(" ")
          $("[data-match-id~='#{ id }']").removeClass("highlight")

      @form.bind "submit", (e) =>
        e.preventDefault()
        @test $("textarea", @form.markup).val(), @getSelectedClients()

    test: (input, clients) ->
      # Clear the results table from any previous output
      @table.html ""
       
      input = @suite.execute input, clients

      # Write the highlighted source code to the results table
      for line, index in input.split("\n")
        @table.append(
          """
          <tr>
            <th>#{ index + 1 }</th>
            <td style=\"padding-left:#{ line.match(/^(\s*)/)[1].length }em\">#{ line }</td>
          </tr>
          """
        )

      $("#results").show();

    getSelectedClients: () ->
      (el.value for el in $("[name='client[]']:checked", @form))

  #
  # Parser parses document's CSS definitions into tokens
  #
  class CssGuide.Parser
    constructor: (dom) ->
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
      for node in $("[style]", dom) when "" != $(node).attr "style"
          @tokens.push
            selector: node
            css: @parseCssText $(node).attr "style"

    # Find a token by name of a CSS property
    findByProperty: (properties...) ->
      tokens = []
      for property in properties
        for token in @tokens when token.css[property] != undefined
          tokens.push token if -1 is jQuery.inArray token, tokens
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

    # Create a blank HTML document and inject input to it
    createDocument: (input) ->
        $("iframe").remove();
        $('<iframe name="tokenizer" style="display:none;"></iframe>').appendTo(window.document.body);

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

      parser = new CssGuide.Parser dom

      for test, id in @constructor.registry when CssGuide.intersection(test.clients, clients).length
        for matches in test.callback(dom, parser) || []
          matches = [matches] unless matches instanceof Array
          for match in matches
            meta = if $(match).attr('data-match-id') then $(match).attr('data-match-id') + ' ' + id else id
            $(match).attr('data-match-id', meta)

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

    getClients: ->
      @constructor.clients

    getTest: (id) ->
      @constructor.registry[id]

  class CssGuide.EmailSuite extends CssGuide.Suite
    @clients = 
      android_email:
        name: "Android Email"
      android_gmail:
        name: "Android Gmail"
      aol_10:
        name: "AOL Desktop 10"
        share: 0.012
      aol_web:
        name: "AOL Web"
      apple_iphone_3:
        name: "Apple iPhone 3.0"
        share: 0.04
      apple_mail:
        name: "Apple Mail"
        share: 0.04
      blackberry:
        name: "Blackberry"
      entourage_04:
        name: "Entourage 2004"
      entourage_08:
        name: "Entourage 2008"
      gmail:
        name: "Google Gmail"
        share: 0.05
      hotmail:
        name: "Live Hotmail"
        share: 0.17
      mobileme:
        name: "MobileMe"
      myspace:
        name: "MySpace"
      notes_7:
        name: "Lotus Notes 6/7"
        share: 0.004
      notes_8:
        name: "Lotus Notes 8.5"
      outlook_03:
        name: "Outlook 2000/03"
        share: 0.34
      outlook_07:
        name: "Outlook 2007/10"
        share: 0.9
      palm_garnet:
        name: "Palm Garnet OS"
      thunderbird_2:
        name: "Thunderbird 2"
        share: 0.024
      yahoo_classic:
        name: "Yahoo! Classic"
      yahoo_mail:
        name: "Yahoo! Mail"
        share: 0.13
      webos:
        name: "WebOS"
      windows_mail:
        name: "Windows Mail"
        share: 0.02
      win_mobile_65:
        name: "Windows Mobile 6.5"

    # HTML elements #

    @defineTest
      description: "Does not support <style> element within <head>"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "blackberry", "gmail", "myspace", "notes_7", "palm_garnet" ]
      callback: (dom, parser) ->
        $("head style", dom)

    @defineTest
      description: "Does not support <style> element within <body>"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "blackberry", "gmail", "mobileme", "myspace", "notes_7", "palm_garnet" ]
      callback: (dom, parser) ->
        $("body style", dom)

    @defineTest
      description: "Does not support <link> element within <head>"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "blackberry", "gmail", "myspace", "palm_garnet" ]
      callback: (dom, parser) ->
        $("head link", dom)

    @defineTest
      description: "Does not support <link> element within <body>"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "blackberry", "gmail", "mobileme", "myspace", "notes_7", "palm_garnet" ]
      callback: (dom, parser) ->
        $("body link", dom)

    @defineTest
      description: "Does not support <frameset> element"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_07" ]
      callback: (dom, parser) ->
        $("frameset", dom)

    @defineTest
      description: "Does not support <frame> element"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_07" ]
      callback: (dom, parser) ->
        $("frame", dom)

    # HTML attributes #

    @defineTest
      description: "Does not support 'cols' attribute on <textarea> elements"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_07" ]
      callback: (dom, parser) ->
        $("textarea[cols]", dom)

    @defineTest
      description: "Does not support 'colspan' attribute on table cells"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_07" ]
      callback: (dom, parser) ->
        $("td[colspan], th[colspan]", dom)

    @defineTest
      description: "Does not support 'rowspan' attribute on table cells"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_07" ]
      callback: (dom, parser) ->
        $("td[rowspan], th[rowspan]", dom)

    # CSS selectors #

    @defineTest
      description: "Does not support 'element' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "blackberry", "gmail", "myspace", "notes_7", "webos", "win_mobile_65" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector /\b[a-z1-9]\b/i
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support '*' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "blackberry", "gmail", "mobileme", "myspace", "notes_7", "outlook_07", "webos", "yahoo_classic", "win_mobile_65" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector /\*/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support '.class' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "gmail", "myspace", "notes_7" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector /\./
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support '#id' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "gmail", "hotmail", "mobileme", "myspace", "notes_7" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector  /#/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support ':link' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "blackberry", "gmail", "mobileme", "myspace", "notes_7", "palm_garnet" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector /:link/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support ':active' or ':hover' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "aol_web", "blackberry", "gmail", "mobileme", "myspace", "notes_7", "outlook_07", "palm_garnet" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector /:active|:hover/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support ':first-line' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "aol_web", "blackberry", "gmail", "hotmail", "mobileme", "myspace", "notes_7", "outlook_07", "palm_garnet", "win_mobile_65", "yahoo_mail" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector /:first-line/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support ':first-letter' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "aol_web", "blackberry", "gmail", "hotmail", "mobileme", "myspace", "notes_7", "outlook_07", "palm_garnet", "win_mobile_65", "yahoo_mail" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector /:first-letter/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support '>' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "aol_10", "blackberry", "gmail", "hotmail", "apple_iphone_3", "mobileme", "myspace", "notes_7", "notes_8", "outlook_03", "outlook_07", "palm_garnet", "webos", "win_mobile_65", "windows_mail" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector />/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support ':focus' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "aol_10", "blackberry", "gmail", "hotmail", "mobileme", "myspace", "notes_7", "notes_8", "outlook_03", "outlook_07", "palm_garnet", "win_mobile_65", "windows_mail" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector /:focus/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support '+' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "aol_10", "blackberry", "entourage_04", "gmail", "hotmail", "mobileme", "myspace", "notes_7", "notes_8", "outlook_03", "outlook_07", "palm_garnet", "windows_mail", "yahoo_classic", "yahoo_mail" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector /\+/
        $(selectors.join(", "), dom) if selectors.length > 0

    @defineTest
      description: "Does not support '[attribute]' CSS selector"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "aol_10", "blackberry", "entourage_04", "gmail", "hotmail", "mobileme", "myspace", "notes_7", "notes_8", "outlook_03", "outlook_07", "windows_mail" ]
      callback: (dom, parser) ->
        selectors = parser.findBySelector /\[/
        $(selectors.join(", "), dom) if selectors.length > 0

    # CSS properties #

    @defineTest
      description: "Does not support 'direction' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "entourage_04", "gmail", "notes_7", "outlook_07" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("direction")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'font' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry", "notes_7", "palm_garnet" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("font")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'font-family' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry", "palm_garnet", "win_mobile_65" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("font-family")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'font-style' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "palm_garnet" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("font-style")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'font-variant' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry", "notes_7", "palm_garnet" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("font-variant")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'font-size' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("font-size")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'letter-spacing' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry", "notes_7", "palm_garnet", "win_mobile_65" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("letter-spacing")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'line-height' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry", "myspace", "notes_7", "palm_garnet" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("line-height")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'text-indent' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry", "notes_7" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("text-indent")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'text-overflow' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry", "entourage_04", "myspace", "notes_7", "outlook_07", "palm_garnet", "thunderbird_2", "yahoo_classic", "yahoo_mail" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("text-overflow")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'text-shadow' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "aol_10", "aol_web", "blackberry", "entourage_04", "mobileme", "myspace", "notes_7", "notes_8", "outlook_03", "outlook_07", "palm_garnet", "thunderbird_2", "webos", "windows_mail", "win_mobile_65" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("text-shadow")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'text-transform' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "notes_7", "palm_garnet" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("text-transform")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'white-space' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "aol_10", "aol_web", "blackberry", "notes_7", "notes_8", "outlook_03", "palm_garnet", "windows_mail", "win_mobile_65" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("white-space")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'word-spacing' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry", "notes_7", "outlook_07", "palm_garnet", "win_mobile_65" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("word-spacing")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'word-wrap' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "android_gmail", "blackberry", "gmail", "hotmail", "entourage_04", "myspace", "notes_7", "outlook_07", "palm_garnet", "thunderbird_2", "win_mobile_65" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("word-wrap")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'vertical-align' CSS property"
      source: "http://www.campaignmonitor.com/css/"
      clients: [ "blackberry", "android_email", "notes_7", "outlook_07" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("vertical-align")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'padding' CSS property on <div> and <p> elements"
      source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx"
      clients: [ "outlook_07" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("padding", "padding-top", "padding-right", "padding-bottom", "padding-left")
          $(token.selector, dom).filter "p, div"

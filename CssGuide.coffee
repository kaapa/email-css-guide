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
    constructor: (@suite, @form, @table) ->
      div = $("div:nth-child(2)", @form)      
      template = $("[name='client[]']").closest("label").remove()      
      for id, client of @suite.getClients()
        div.append template.clone().append(client.name).find("input").val(id).end()

      $("[data-match-id]").live "mouseenter", () ->
        for id in $(this).attr("data-match-id").split(" ")
          $("[data-match-id~='#{ id }']").addClass("highlight")

      $("[data-match-id]").live "mouseleave", () ->
        for id in $(this).attr("data-match-id").split(" ")
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
      # Tokenize style element CSS
      for node in $("style", dom) when "" != $(node).html()
        @tokens = @tokens.concat @parse node
      # Tokenize inline CSS
      for node in $("[style]", dom) when "" != $(node).attr "style"
        @tokens.push @parse node

    # Find a token by name of a CSS property
    findByProperty: (property) ->
      token for token in @tokens when token.css[property] != undefined

    # Tokenize CSS
    # For style sheets returns an array of tokens
    # For inline styles returns a single token
    parse: (node) ->
      if "STYLE" == node.nodeName
        tokens = []
        for definition in ($(node).html().match /[^{]+{[^}]+}/gi) || []
          [match, selector, css] = definition.match /([^{]+){([^}]+)}/m
          token = { selector: selector, css: {} }
          for style in css.split(";")
            [property, value] = style.split(":")
            if property?
              token.css[CssGuide.trim property] = if value? then CssGuide.trim value else ""
          tokens.push token
        tokens
      else
        token = { selector: node, css: {} }      
        for style in $(node).attr("style").split(";")
          [property, value] = style.split(":")
          if property?
            token.css[CssGuide.trim property] = if value? then CssGuide.trim value else ""
        token

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
        for matches in test.callback(dom, parser) when matches.length
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

  class CssGuide.EmailSuite extends CssGuide.Suite
    @clients = 
      android_email:
        name: "Android Email"
      android_gmail:
        name: "Android Gmail"
      aol_10:
        name: "AOL Desktop 10"
      aol_web:
        name: "AOL Web"
      apple_iphone_3:
        name: "Apple iPhone 3.0"
      apple_mail:
        name: "Apple Mail"
      blackberry:
        name: "Blackberry"
      entourage_04:
        name: "Entourage 2004"
      entourage_08:
        name: "Entourage 2008"
      gmail:
        name: "Google Gmail"
      hotmail:
        name: "Live Hotmail"
      mobileme:
        name: "MobileMe"
      myspace:
        name: "MySpace"
      notes_7:
        name: "Lotus Notes 6/7"
      notes_8:
        name: "Lotus Notes 8.5"
      outlook_03:
        name: "Outlook 2000/03"
      outlook_07:
        name: "Outlook 2007/10"
      palm_garnet:
        name: "Palm Garnet OS"
      thunderbird_2:
        name: "Thunderbird 2"
      yahoo_classic:
        name: "Yahoo! Classic"
      yahoo_mail:
        name: "Yahoo! Mail"
      webos:
        name: "WebOS"
      windows_mail:
        name: "Windows Mail"
      win_mobile_65:
        name: "Windows Mobile 6.5"

    @defineTest
      description: "Does not support 'font-family' CSS attribute"
      clients: [ "gmail", "outlook_07" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("font-family")
          $(token.selector, dom)

    @defineTest
      description: "Does not support 'font-weight' CSS attribute"
      clients: [ "gmail", "outlook_07" ]
      callback: (dom, parser) ->
        for token in parser.findByProperty("font-weight")
          $(token.selector, dom)
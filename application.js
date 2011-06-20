(function() {
  var exports;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __slice = Array.prototype.slice, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  if (typeof exports === "undefined" || exports === null) {
    exports = window;
  }
  exports.CssGuide = (function() {
    function CssGuide() {}
    CssGuide.intersection = function(a, b) {
      var element, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = a.length; _i < _len; _i++) {
        element = a[_i];
        if (-1 < jQuery.inArray(element, b)) {
          _results.push(element);
        }
      }
      return _results;
    };
    CssGuide.trim = function(string) {
      return string.replace(/^\s*/, "").replace(/\s*$/, "");
    };
    CssGuide.Controller = (function() {
      function Controller(suite, form, table, tooltip) {
        var client, div, id, template, _ref;
        this.suite = suite;
        this.form = form;
        this.table = table;
        this.tooltip = tooltip;
        div = $("div:nth-child(2)", this.form);
        template = $("[name='client[]']").closest("label").remove();
        _ref = this.suite.getClients();
        for (id in _ref) {
          client = _ref[id];
          div.append(template.clone().append(client.name).find("input").attr("checked", client.share != null).val(id).end());
        }
        $("[data-match-id]").live("mouseenter", __bind(function(e) {
          var description, id, position, _i, _len, _ref2;
          description = [];
          position = $(e.target).position();
          _ref2 = $(e.target).attr("data-match-id").split(" ");
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            id = _ref2[_i];
            description.push(this.suite.getTest(id).description);
            $("[data-match-id~='" + id + "']").addClass("highlight");
          }
          this.tooltip.text(description.join("\n\n"));
          return this.tooltip.css({
            display: "block",
            top: "" + (position.top + 5) + "px",
            left: position.left
          });
        }, this));
        $("[data-match-id]").live("mouseleave", __bind(function(e) {
          var id, _i, _len, _ref2, _results;
          this.tooltip.css("display", "none");
          _ref2 = $(e.target).attr("data-match-id").split(" ");
          _results = [];
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            id = _ref2[_i];
            _results.push($("[data-match-id~='" + id + "']").removeClass("highlight"));
          }
          return _results;
        }, this));
        this.form.bind("submit", __bind(function(e) {
          e.preventDefault();
          return this.test($("textarea", this.form.markup).val(), this.getSelectedClients());
        }, this));
      }
      Controller.prototype.test = function(input, clients) {
        var index, line, _len, _ref;
        this.table.html("");
        input = this.suite.execute(input, clients);
        _ref = input.split("\n");
        for (index = 0, _len = _ref.length; index < _len; index++) {
          line = _ref[index];
          this.table.append("<tr>\n  <th>" + (index + 1) + "</th>\n  <td style=\"padding-left:" + (line.match(/^(\s*)/)[1].length) + "em\">" + line + "</td>\n</tr>");
        }
        return $("#results").show();
      };
      Controller.prototype.getSelectedClients = function() {
        var el, _i, _len, _ref, _results;
        _ref = $("[name='client[]']:checked", this.form);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          el = _ref[_i];
          _results.push(el.value);
        }
        return _results;
      };
      return Controller;
    })();
    CssGuide.Parser = (function() {
      function Parser(dom) {
        var node, _i, _j, _len, _len2, _ref, _ref2;
        this.tokens = [];
        _ref = $("style", dom);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          node = _ref[_i];
          if ("" !== $(node).html()) {
            this.tokens = this.tokens.concat(this.parse(node));
          }
        }
        _ref2 = $("[style]", dom);
        for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
          node = _ref2[_j];
          if ("" !== $(node).attr("style")) {
            this.tokens.push(this.parse(node));
          }
        }
      }
      Parser.prototype.findByProperty = function() {
        var properties, property, token, tokens, _i, _j, _len, _len2, _ref;
        properties = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        tokens = [];
        for (_i = 0, _len = properties.length; _i < _len; _i++) {
          property = properties[_i];
          _ref = this.tokens;
          for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
            token = _ref[_j];
            if (token.css[property] !== void 0) {
              tokens.push(token);
            }
          }
        }
        return tokens;
      };
      Parser.prototype.findBySelector = function(selector) {
        var token, _i, _len, _ref, _results;
        if (!(selector instanceof RegExp)) {
          selector = new RegExp("\b" + selector + "\b");
        }
        _ref = this.tokens;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          token = _ref[_i];
          if (token.selector instanceof String && token.selector.match(selector)) {
            _results.push(token.selector);
          }
        }
        return _results;
      };
      Parser.prototype.parse = function(node) {
        var css, definition, match, property, selector, style, token, tokens, value, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3, _ref4, _ref5, _ref6;
        if ("STYLE" === node.nodeName) {
          tokens = [];
          _ref = ($(node).html().match(/[^{]+{[^}]+}/gi)) || [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            definition = _ref[_i];
            _ref2 = definition.match(/([^{]+){([^}]+)}/m), match = _ref2[0], selector = _ref2[1], css = _ref2[2];
            token = {
              selector: CssGuide.trim(selector),
              css: {}
            };
            _ref3 = css.split(";");
            for (_j = 0, _len2 = _ref3.length; _j < _len2; _j++) {
              style = _ref3[_j];
              _ref4 = style.split(":"), property = _ref4[0], value = _ref4[1];
              if (property != null) {
                token.css[CssGuide.trim(property)] = value != null ? CssGuide.trim(value) : "";
              }
            }
            tokens.push(token);
          }
          return tokens;
        } else {
          token = {
            selector: node,
            css: {}
          };
          _ref5 = $(node).attr("style").split(";");
          for (_k = 0, _len3 = _ref5.length; _k < _len3; _k++) {
            style = _ref5[_k];
            _ref6 = style.split(":"), property = _ref6[0], value = _ref6[1];
            if (property != null) {
              token.css[CssGuide.trim(property)] = value != null ? CssGuide.trim(value) : "";
            }
          }
          return token;
        }
      };
      return Parser;
    })();
    CssGuide.Suite = (function() {
      function Suite() {}
      Suite.registry = [];
      Suite.defineTest = function(definition) {
        return this.registry.push(definition);
      };
      Suite.prototype.createDocument = function(input) {
        $("iframe").remove();
        $('<iframe name="tokenizer" style="display:none;"></iframe>').appendTo(window.document.body);
        if (!input.match(/<html[^>]*>/)) {
          if (!input.match(/<body[^>]*>/)) {
            input = "<body>" + input + "</body>";
          }
          input = "<html>" + input + "</html>";
        }
        window.frames.tokenizer.document.write(input);
        return window.frames.tokenizer.document;
      };
      Suite.prototype.execute = function(input, clients, seed) {
        var dom, id, markup, match, matches, meta, mid, nid, parser, test, _i, _j, _k, _len, _len2, _len3, _len4, _ref, _ref2, _ref3, _ref4, _ref5;
        if (seed == null) {
          seed = 0;
        }
        input = input.replace(/<(?!\/)([^>]+)>/gi, function(all, match) {
          return '<' + match + ' data-node-id="' + (seed++) + '">';
        });
        markup = input.replace(/type="(text\/javascript)"/g, 'type="text/disabled-javascript"');
        dom = this.createDocument(markup);
        parser = new CssGuide.Parser(dom);
        _ref = this.constructor.registry;
        for (id = 0, _len = _ref.length; id < _len; id++) {
          test = _ref[id];
          if (CssGuide.intersection(test.clients, clients).length) {
            _ref2 = test.callback(dom, parser) || [];
            for (_i = 0, _len2 = _ref2.length; _i < _len2; _i++) {
              matches = _ref2[_i];
              if (!(matches instanceof Array)) {
                matches = [matches];
              }
              for (_j = 0, _len3 = matches.length; _j < _len3; _j++) {
                match = matches[_j];
                meta = $(match).attr('data-match-id') ? $(match).attr('data-match-id') + ' ' + id : id;
                $(match).attr('data-match-id', meta);
              }
            }
          }
        }
        markup = dom.documentElement.innerHTML;
        _ref3 = (markup.match(/<[^>]+data-match-id="[^"]+"[^>]*>/gi)) || [];
        for (_k = 0, _len4 = _ref3.length; _k < _len4; _k++) {
          match = _ref3[_k];
          if (match != null) {
            nid = (_ref4 = match.match(/data-node-id="([^"]+)"/i)) != null ? _ref4[1] : void 0;
            mid = (_ref5 = match.match(/data-match-id="([^"]+)"/i)) != null ? _ref5[1] : void 0;
            input = input.replace(new RegExp('data-node-id="' + nid + '"'), 'data-match-id="' + mid + '"');
          }
        }
        input = input.replace(/\sdata-node-id="[^"]+"/gi, "");
        input = input.replace(/<([^>]+?)\s?data-match-id="([^"]+)"([^>]*)>/gi, '{span class="match" data-match-id="$2"}<$1$3>{/span}');
        input = jQuery("<div/>").text(input).html();
        return input = input.replace(new RegExp('{span class="match" data-match-id="([^"]+)"}(.+?){\/span}', "g"), '<span class="match" data-match-id="$1">$2</span>');
      };
      Suite.prototype.getClients = function() {
        return this.constructor.clients;
      };
      Suite.prototype.getTest = function(id) {
        return this.constructor.registry[id];
      };
      return Suite;
    })();
    CssGuide.EmailSuite = (function() {
      __extends(EmailSuite, CssGuide.Suite);
      function EmailSuite() {
        EmailSuite.__super__.constructor.apply(this, arguments);
      }
      EmailSuite.clients = {
        android_email: {
          name: "Android Email"
        },
        android_gmail: {
          name: "Android Gmail"
        },
        aol_10: {
          name: "AOL Desktop 10",
          share: 0.012
        },
        aol_web: {
          name: "AOL Web"
        },
        apple_iphone_3: {
          name: "Apple iPhone 3.0",
          share: 0.04
        },
        apple_mail: {
          name: "Apple Mail",
          share: 0.04
        },
        blackberry: {
          name: "Blackberry"
        },
        entourage_04: {
          name: "Entourage 2004"
        },
        entourage_08: {
          name: "Entourage 2008"
        },
        gmail: {
          name: "Google Gmail",
          share: 0.05
        },
        hotmail: {
          name: "Live Hotmail",
          share: 0.17
        },
        mobileme: {
          name: "MobileMe"
        },
        myspace: {
          name: "MySpace"
        },
        notes_7: {
          name: "Lotus Notes 6/7",
          share: 0.004
        },
        notes_8: {
          name: "Lotus Notes 8.5"
        },
        outlook_03: {
          name: "Outlook 2000/03",
          share: 0.34
        },
        outlook_07: {
          name: "Outlook 2007/10",
          share: 0.9
        },
        palm_garnet: {
          name: "Palm Garnet OS"
        },
        thunderbird_2: {
          name: "Thunderbird 2",
          share: 0.024
        },
        yahoo_classic: {
          name: "Yahoo! Classic"
        },
        yahoo_mail: {
          name: "Yahoo! Mail",
          share: 0.13
        },
        webos: {
          name: "WebOS"
        },
        windows_mail: {
          name: "Windows Mail",
          share: 0.02
        },
        win_mobile_65: {
          name: "Windows Mobile 6.5"
        }
      };
      EmailSuite.defineTest({
        description: "Does not support <style> element within <head>",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "blackberry", "gmail", "myspace", "notes_7", "palm_garnet"],
        callback: function(dom, parser) {
          return $("head style", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support <style> element within <body>",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "blackberry", "gmail", "mobileme", "myspace", "notes_7", "palm_garnet"],
        callback: function(dom, parser) {
          return $("body style", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support <link> element within <head>",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "blackberry", "gmail", "myspace", "palm_garnet"],
        callback: function(dom, parser) {
          return $("head link", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support <link> element within <body>",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "blackberry", "gmail", "mobileme", "myspace", "notes_7", "palm_garnet"],
        callback: function(dom, parser) {
          return $("body link", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support <frameset> element",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_07"],
        callback: function(dom, parser) {
          return $("frameset", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support <frame> element",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_07"],
        callback: function(dom, parser) {
          return $("frame", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'cols' attribute on <textarea> elements",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_07"],
        callback: function(dom, parser) {
          return $("textarea[cols]", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'colspan' attribute on table cells",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_07"],
        callback: function(dom, parser) {
          return $("td[colspan], th[colspan]", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'rowspan' attribute on table cells",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_07"],
        callback: function(dom, parser) {
          return $("td[rowspan], th[rowspan]", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'element' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "blackberry", "gmail", "myspace", "notes_7", "webos", "win_mobile_65"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\b[a-z1-9]\b/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support '*' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "blackberry", "gmail", "mobileme", "myspace", "notes_7", "outlook_07", "webos", "yahoo_classic", "win_mobile_65"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\*/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support '.class' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "gmail", "myspace", "notes_7"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\./);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support '#id' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "gmail", "hotmail", "mobileme", "myspace", "notes_7"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/#/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support ':link' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "blackberry", "gmail", "mobileme", "myspace", "notes_7", "palm_garnet"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:link/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support ':active' or ':hover' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "aol_web", "blackberry", "gmail", "mobileme", "myspace", "notes_7", "outlook_07", "palm_garnet"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:active|:hover/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support ':first-line' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "aol_web", "blackberry", "gmail", "hotmail", "mobileme", "myspace", "notes_7", "outlook_07", "palm_garnet", "win_mobile_65", "yahoo_mail"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:first-line/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support ':first-letter' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "aol_web", "blackberry", "gmail", "hotmail", "mobileme", "myspace", "notes_7", "outlook_07", "palm_garnet", "win_mobile_65", "yahoo_mail"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:first-letter/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support '>' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "aol_10", "blackberry", "gmail", "hotmail", "apple_iphone_3", "mobileme", "myspace", "notes_7", "notes_8", "outlook_03", "outlook_07", "palm_garnet", "webos", "win_mobile_65", "windows_mail"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/>/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support ':focus' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "aol_10", "blackberry", "gmail", "hotmail", "mobileme", "myspace", "notes_7", "notes_8", "outlook_03", "outlook_07", "palm_garnet", "win_mobile_65", "windows_mail"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:focus/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support '+' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "aol_10", "blackberry", "entourage_04", "gmail", "hotmail", "mobileme", "myspace", "notes_7", "notes_8", "outlook_03", "outlook_07", "palm_garnet", "windows_mail", "yahoo_classic", "yahoo_mail"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\+/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support '[attribute]' CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "aol_10", "blackberry", "entourage_04", "gmail", "hotmail", "mobileme", "myspace", "notes_7", "notes_8", "outlook_03", "outlook_07", "windows_mail"],
        callback: function(dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\[/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'direction' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "entourage_04", "gmail", "notes_7", "outlook_07"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("direction");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'font' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry", "notes_7", "palm_garnet"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("font");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'font-family' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry", "palm_garnet", "win_mobile_65"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("font-family");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'font-style' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["palm_garnet"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("font-style");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'font-variant' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry", "notes_7", "palm_garnet"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("font-variant");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'font-size' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("font-size");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'letter-spacing' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry", "notes_7", "palm_garnet", "win_mobile_65"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("letter-spacing");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'line-height' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry", "myspace", "notes_7", "palm_garnet"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("line-height");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'text-indent' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry", "notes_7"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("text-indent");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'text-overflow' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry", "entourage_04", "myspace", "notes_7", "outlook_07", "palm_garnet", "thunderbird_2", "yahoo_classic", "yahoo_mail"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("text-overflow");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'text-shadow' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["aol_10", "aol_web", "blackberry", "entourage_04", "mobileme", "myspace", "notes_7", "notes_8", "outlook_03", "outlook_07", "palm_garnet", "thunderbird_2", "webos", "windows_mail", "win_mobile_65"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("text-shadow");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'text-transform' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["notes_7", "palm_garnet"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("text-transform");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'white-space' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["aol_10", "aol_web", "blackberry", "notes_7", "notes_8", "outlook_03", "palm_garnet", "windows_mail", "win_mobile_65"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("white-space");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'word-spacing' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry", "notes_7", "outlook_07", "palm_garnet", "win_mobile_65"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("word-spacing");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'word-wrap' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["android_gmail", "blackberry", "gmail", "hotmail", "entourage_04", "myspace", "notes_7", "outlook_07", "palm_garnet", "thunderbird_2", "win_mobile_65"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("word-wrap");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'vertical-align' CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry", "android_email", "notes_7", "outlook_07"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("vertical-align");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'padding' CSS property on <div> and <p> elements",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_07"],
        callback: function(dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("padding", "padding-top", "padding-right", "padding-bottom", "padding-left");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom).filter("p, div"));
          }
          return _results;
        }
      });
      return EmailSuite;
    })();
    return CssGuide;
  }).call(this);
}).call(this);

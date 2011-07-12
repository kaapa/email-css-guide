(function() {
  var exports;
  var __slice = Array.prototype.slice, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
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
      return a.filter(function(n) {
        return b.indexOf(n) === -1;
      });
    };
    CssGuide.trim = function(string) {
      return string.replace(/^\s*/, "").replace(/\s*$/, "");
    };
    CssGuide.Parser = (function() {
      function Parser(engine, dom) {
        var node, rule, sheet, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3;
        this.engine = engine;
        this.tokens = [];
        _ref = dom.styleSheets;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          sheet = _ref[_i];
          try {
            _ref2 = sheet.cssRules;
            for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
              rule = _ref2[_j];
              this.tokens.push({
                selector: rule.selectorText,
                css: this.parseCssText(rule.style.cssText)
              });
            }
          } catch (e) {

          }
        }
        _ref3 = this.engine("[style]", dom);
        for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
          node = _ref3[_k];
          if ("" !== this.engine(node).attr("style")) {
            this.tokens.push({
              selector: node,
              css: this.parseCssText(this.engine(node).attr("style"))
            });
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
              if (-1 === tokens.indexOf(token)) {
                tokens.push(token);
              }
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
      Parser.prototype.parseCssText = function(text) {
        var css, definition, property, value, _i, _len, _ref, _ref2;
        css = {};
        _ref = text.split(";");
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          definition = _ref[_i];
          if (definition !== "") {
            _ref2 = definition.split(":"), property = _ref2[0], value = _ref2[1];
            if (property != null) {
              css[CssGuide.trim(property)] = value != null ? CssGuide.trim(value) : "";
            }
          }
        }
        return css;
      };
      return Parser;
    })();
    CssGuide.Suite = (function() {
      Suite.registry = [];
      Suite.defineTest = function(definition) {
        return this.registry.push(definition);
      };
      function Suite(engine) {
        this.engine = engine;
      }
      Suite.prototype.createDocument = function(input) {
        this.engine("iframe").remove();
        this.engine('<iframe name="tokenizer" style="display:none;"></iframe>').appendTo(window.document.body);
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
        parser = new CssGuide.Parser(this.engine, dom);
        _ref = this.constructor.registry;
        for (id = 0, _len = _ref.length; id < _len; id++) {
          test = _ref[id];
          if (CssGuide.intersection(test.clients, clients).length) {
            _ref2 = test.callback(this.engine, dom, parser) || [];
            for (_i = 0, _len2 = _ref2.length; _i < _len2; _i++) {
              matches = _ref2[_i];
              if (!(matches instanceof Array)) {
                matches = [matches];
              }
              for (_j = 0, _len3 = matches.length; _j < _len3; _j++) {
                match = matches[_j];
                meta = this.engine(match).attr('data-match-id') ? this.engine(match).attr('data-match-id') + ' ' + id : id;
                this.engine(match).attr('data-match-id', meta);
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
      Suite.prototype.getClient = function(id) {
        return {
          id: id,
          name: this.constructor.clients[id].name,
          share: this.constructor.clients[id].share != null,
          type: this.constructor.clients[id].type
        };
      };
      Suite.prototype.getClients = function() {
        var clients, id;
        clients = (function() {
          var _results;
          _results = [];
          for (id in this.constructor.clients) {
            _results.push(this.getClient(id));
          }
          return _results;
        }).call(this);
        return clients.sort(function(a, b) {
          var _ref;
          _ref = [a.name.toLowerCase(), b.name.toLowerCase()], a = _ref[0], b = _ref[1];
          if (a < b) {
            return -1;
          } else if (a > b) {
            return 1;
          } else {
            return 1;
          }
        });
      };
      Suite.prototype.getClientsCategorized = function() {
        var categories, client, _i, _len, _ref;
        categories = {
          desktop: [],
          mobile: [],
          web: []
        };
        _ref = this.getClients();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          client = _ref[_i];
          categories[client.type].push(client);
        }
        return categories;
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
        hotmail: {
          name: "Windows Live Hotmail",
          type: "web",
          share: 0.17
        },
        yahoo: {
          name: "Yahoo! Mail Beta",
          type: "web",
          share: 0.13
        },
        gmail: {
          name: "Gmail",
          type: "web",
          share: 0.05
        },
        aol: {
          name: "AOL Mail",
          type: "web"
        },
        outlook_2011_mac: {
          name: "Outlook 2011 (Mac)",
          type: "desktop"
        },
        outlook_10: {
          name: "Outlook '07 / '10",
          type: "desktop",
          share: 0.9
        },
        outlook_03: {
          name: "Outlook '03 / Express / Mail",
          type: "desktop",
          share: 0.36
        },
        apple_mail_4: {
          name: "Apple Mail 4",
          share: 0.04,
          type: "desktop"
        },
        entourage_2008: {
          name: "Entourage 2008",
          type: "desktop"
        },
        notes_7: {
          name: "Notes 6 / 7",
          type: "desktop"
        },
        notes_8: {
          name: "Lotus Notes 8.5",
          type: "desktop",
          share: 0.004
        },
        aol_10: {
          name: "AOL Desktop 10",
          type: "desktop",
          share: 0.012
        },
        thunderbird_2: {
          name: "Thunderbird 2",
          type: "desktop",
          share: 0.024
        },
        ios_4: {
          name: "iPhone iOS 4 / iPad",
          type: "mobile",
          share: 0.04
        },
        blackberry_6: {
          name: "Blackberry 6",
          type: "mobile"
        },
        android_gingerbread: {
          name: "Android 2.3 (Default mail)",
          type: "mobile"
        },
        android_gingerbread_gmail: {
          name: "Android 2.3 (Gmail)",
          type: "mobile"
        },
        windows_mobile_7: {
          name: "Windows Mobile 7",
          type: "mobile"
        },
        webos_2: {
          name: "HP webOS 2",
          type: "mobile"
        }
      };
      EmailSuite.defineTest({
        description: "Does not support <style> element within <head>",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["gmail", "notes_7", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          return $("head style", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support <style> element within <body>",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["gmail", "notes_7", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          return $("body style", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support <link> element within <head>",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "aol", "notes_7", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          return $("head link", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support <link> element within <body>",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "aol", "notes_7", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          return $("body link", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support <frameset> element",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_10", "outlook_2011_mac"],
        callback: function($, dom, parser) {
          return $("frameset", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support <frame> element",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_10", "outlook_2011_mac"],
        callback: function($, dom, parser) {
          return $("frame", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'cols' attribute on <textarea> elements",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_10", "outlook_2011_mac"],
        callback: function($, dom, parser) {
          return $("textarea[cols]", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'colspan' attribute on table cells",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_10", "outlook_2011_mac"],
        callback: function($, dom, parser) {
          return $("td[colspan], th[colspan]", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support 'rowspan' attribute on table cells",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_10", "outlook_2011_mac"],
        callback: function($, dom, parser) {
          return $("td[rowspan], th[rowspan]", dom);
        }
      });
      EmailSuite.defineTest({
        description: "Does not support * CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "aol", "outlook_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\*/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["gmail", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\b[a-z1-9]\b/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support [attribute] CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\[[a-z0-9_-]+\]/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support [attribute='value'] CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: [],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\[[a-z0-9_-]+=[^\]]+\]/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support [attribute='value'] CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\[[a-z0-9_-]+=[^\]]+\]/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support [attribute~='value'] CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\[[a-z0-9_-]+~=[^\]]+\]/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support [attribute^='value'] CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\[[a-z0-9_-]+^=[^\]]+\]/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support [attribute$='value'] CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\[[a-z0-9_-]+\$=[^\]]+\]/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support [attribute*='value'] CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\[[a-z0-9_-]+\*=[^\]]+\]/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:nth-child(n) CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:nth-child/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:nth-last-child(n) CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:nth-last-child/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:nth-of-type(n) CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:nth-of-type/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:nth-last-of-type(n) CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:nth-last-of-type/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:first-child CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:first-child/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:last-child CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:last-child/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:first-of-type CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:first-of-type/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:last-of-type CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:last-of-type/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:empty CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_03", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:empty/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:link CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:link/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:visited CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "gmail", "aol", "outlook_2011_mac", "outlook_03", "apple_mail_4", "entourage_2008", "notes_7", "thunderbird_2", "android_gingerbread_gmail", "windows_mobile_7", "webos_2"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:visited/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:active CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["gmail", "outlook_10", "notes_7", "ios_4", "blackberry_6", "android_gingerbread", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:active/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:hover CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["gmail", "outlook_10", "notes_7", "ios_4", "blackberry_6", "android_gingerbread", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:hover/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:focus CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "aol", "outlook_2011_mac", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread", "android_gingerbread_gmail", "windows_mobile_7", "webos_2"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:focus/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:target CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "aol", "outlook_2011_mac", "outlook_10", "outlook_03", "apple_mail_4", "entourage_2008", "notes_7", "notes_8", "aol_desktop_10", "thunderbird_2", "ios_4", "blackberry_6", "android_gingerbread", "android_gingerbread_gmail", "windows_mobile_7", "webos_2"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:target/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:first-line CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "gmail", "outlook_10", "thunderbird_2", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:first-line/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:first-letter CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "gmail", "outlook_10", "thunderbird_2", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:first-letter/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:before CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:before/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:after CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:after/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E.class CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["gmail", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\./);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E#id CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "gmail", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/#/);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E:not(s) CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/:not\(/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E F CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["gmail", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\w\s\w/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E > F CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "gmail", "aol", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "blackberry_6", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/>/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E + F CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "gmail", "outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\s\+\s/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support E - F CSS selector",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "outlook_10", "notes_7", "notes_8", "aol_desktop_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var selectors;
          selectors = parser.findBySelector(/\s\-\s/i);
          if (selectors.length > 0) {
            return $(selectors.join(", "), dom);
          }
        }
      });
      EmailSuite.defineTest({
        description: "Does not support direction CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["outlook_10", "notes_7"],
        callback: function($, dom, parser) {
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
        description: "Does not support font CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["notes_7"],
        callback: function($, dom, parser) {
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
        description: "Does not support font-family CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: [],
        callback: function($, dom, parser) {
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
        description: "Does not support font-style CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: [],
        callback: function($, dom, parser) {
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
        description: "Does not support font-variant CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["notes_7"],
        callback: function($, dom, parser) {
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
        description: "Minimum font-size is 13px",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["ios_4"],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("font-size");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push(!(parseInt(token.css["font-size"]) < 13) ? $(token.selector, dom) : void 0);
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support font-size CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["blackberry_6"],
        callback: function($, dom, parser) {
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
        description: "Does not support font-weight CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: [],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("font-weight");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support letter-spacing CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["notes_7"],
        callback: function($, dom, parser) {
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
        description: "Does not support line-height CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["notes_7"],
        callback: function($, dom, parser) {
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
        description: "Does not support text-align CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: [],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("text-align");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support text-decoration CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: [],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("text-decoration");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support text-indent CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["notes_7"],
        callback: function($, dom, parser) {
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
        description: "Does not support text-overflow CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["outlook_10", "notes_7", "thunderbird_2", "blackberry_6", "windows_mobile_7"],
        callback: function($, dom, parser) {
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
        description: "Firefox does not support text-overflow: ellipsis",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "aol"],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("text-overflow");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push(token.css["text-overflow"] === "ellipsis" ? $(token.selector, dom) : void 0);
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support text-shadow CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["outlook_10", "outlook_03", "notes_7", "notes_8", "aol_desktop_10", "thunderbird_2", "windows_mobile_7", "webos_2"],
        callback: function($, dom, parser) {
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
        description: "Internet Explorer does not support text-shadow CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "yahoo", "gmail", "aol"],
        callback: function($, dom, parser) {
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
        description: "Does not support text-transform CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["notes_7"],
        callback: function($, dom, parser) {
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
        description: "Does not support white-space CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["outlook_03", "notes_7", "notes_8", "aol_desktop_10"],
        callback: function($, dom, parser) {
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
        description: "Does not support word-spacing CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["outlook_10", "notes_7"],
        callback: function($, dom, parser) {
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
        description: "Does not support word-wrap CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["gmail", "outlook_10", "notes_7", "thunderbird_2", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
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
        description: "Does not support word-wrap: normal",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["outlook_03", "notes_8", "aol_desktop_10"],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("text-overflow");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push(token.css["word-wrap"] === "normal" ? $(token.selector, dom) : void 0);
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support vertical-align CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["outlook_10", "notes_7"],
        callback: function($, dom, parser) {
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
        description: "Does not support color CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: [],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("color");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support background CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["notes_7", "notes_8"],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("background");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support background CSS property with images",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "gmail", "outlook_10", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("background");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push(token.css["background"].match(/url\([^)]+\)/gi) ? $(token.selector, dom) : void 0);
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support background-color CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["notes_7"],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("background-color");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support background-image CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "gmail", "outlook_10", "notes_7", "notes_8", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("background-image");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support background-position CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "gmail", "outlook_10", "notes_7", "notes_8", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("background-position");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      EmailSuite.defineTest({
        description: "Does not support background-repeat CSS property",
        source: "http://www.campaignmonitor.com/css/",
        clients: ["hotmail", "gmail", "outlook_10", "notes_7", "notes_8", "android_gingerbread_gmail", "windows_mobile_7"],
        callback: function($, dom, parser) {
          var token, _i, _len, _ref, _results;
          _ref = parser.findByProperty("background-repeat");
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            token = _ref[_i];
            _results.push($(token.selector, dom));
          }
          return _results;
        }
      });
      /*
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
          */
      EmailSuite.defineTest({
        description: "Does not support padding CSS property on <div> and <p> elements",
        source: "http://msdn.microsoft.com/en-us/library/aa338201(v=office.12).aspx",
        clients: ["outlook_10"],
        callback: function($, dom, parser) {
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

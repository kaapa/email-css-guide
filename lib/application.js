jQuery(document).ready(function($){

  var suite = new CssGuide.EmailSuite($);

  $("#categories").tmpl(suite.getClientsCategorized()).appendTo("#clients .content");

  $("#clients .toggle").click(function(e){
    console.log($(this).next());
    $(this).next().toggle();
  });

  $("form").bind("submit", function(e) {
      
      e.preventDefault();

      $("#source").empty();

      var output = suite.execute(
        $("[name='markup']").val(),
        $("[name='client[]']:checked").val()
      );

      var rows = output.split("\n"),
          lines = [];

      for (var i in rows) {

        lines.push({
          number: parseInt(i) + 1,
          content: rows[i],
          indentation: rows[i].match(/^(\s*)/)[1].length
        });
      }

      $("#line").tmpl(lines).appendTo($("#source"));

      $("#results").show();
  });

  $("[data-match-id]").live("mouseenter", function(e) {

    if (!$(e.target).hasClass("match")) {
      return false;
    }
    
    $("#popup ul").empty().parent().appendTo(this);

    var failures = [],
        matches = $(this).attr("data-match-id").split(" ");
    
    for (var i in matches) {

      var test = suite.getTest(matches[i]);

      failures.push({
        clientsAsHtml: function() {
          var names = $.map(test.clients, function(id) {
            return suite.getClient(id).name
          });

          var html = names.slice(0, 3).join(", ");

          if (name.length == 4) {
            html += ' and ' + names[3];
          } else if (names.length > 4) {
            html += ' and <span title="' + names.slice(3).join(", ") + '">' + (names.length - 3) + ' other clients</span>';
          }

          return html;
        },
        description: test.description
      });

      $("[data-match-id~='" + matches[i] + "']").addClass("highlight");
    }

    $("#issue").tmpl(failures).appendTo("#popup ul");
  });

  $("[data-match-id]").live("mouseleave", function(e) {

    if (!$(e.target).hasClass("match")) {
      return false;
    }
    
    var matches = $(this).attr("data-match-id").split(" ");

    for (var i in matches) {
      $("[data-match-id~='" + matches[i] + "']").removeClass("highlight");
    }
  });
});
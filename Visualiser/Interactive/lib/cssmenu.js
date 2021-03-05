(function($) {

  $.fn.menumaker = function(options) {
      
      var cssmenu = $(this), settings = $.extend({
        title: "Menu",
        format: "dropdown",
        sticky: false
      }, options);

      return this.each(function() {
        cssmenu.prepend('<div id="menu-button"><img src="../lib/styles/img/logo_16x16.png" class="logo">' + settings.title + '</div>');

        $(this).find("#menu-button").on('click', function(){
          toggleMenu(this);
        });

        function toggleMenu(button) {
          button=cssmenu.find('#menu-button');
          $(button).toggleClass('menu-opened');
          var mainmenu = $(button).next('ul');
          if (mainmenu.hasClass('open')) {
            mainmenu.hide().removeClass('open');
          }
          else {
            mainmenu.show().addClass('open');
            if (settings.format === "dropdown") {
              mainmenu.find('ul').show();
            }
          }
        }

        cssmenu.find('li ul').parent().addClass('has-sub');

        cssmenu.find('li ul li').on('click',function () {
          var f=$(this).parent().attr("callback");
          var v = $(this).attr("item_value");
          if (f) window[f].apply(window,[v]);
          $(this).parent().find('li').removeClass("selected");
          $(this).addClass("selected");
          $(this).parent().parent().find(".setting").text($(this).text());

          if (cssmenu.find('#menu-button').hasClass('menu-opened') && $( window ).width() <= 900) {
            toggleMenu();
          }
        });

        multiTg = function() {
          cssmenu.find(".has-sub").prepend('<span class="submenu-button"></span>');

          //Looks for selected setting and sets it in parent menu item first time through
          cssmenu.find("ul.options").each(function () {
            var setting = $(this).find("li.selected").text();
            $(this).parent().find("span.setting").text(setting);
          })

          //Handles click on the menu label
          cssmenu.find('.has-sub a').on('click', function() {
            $(this).siblings('span').toggleClass('submenu-opened');
            if ($(this).siblings('ul').hasClass('open')) {
              $(this).siblings('ul').removeClass('open').hide();
            }
            else {
              $(this).siblings('ul').addClass('open').show();
            }
          });

          //Handles click on the menu button
          cssmenu.find('.submenu-button').on('click', function() {
            $(this).toggleClass('submenu-opened');
            if ($(this).siblings('ul').hasClass('open')) {
              $(this).siblings('ul').removeClass('open').hide();
            }
            else {
              $(this).siblings('ul').addClass('open').show();
            }
          });

          /*
          cssmenu.find(".has-sub").prepend('<span class="submenu-button"></span>');
          cssmenu.find('.submenu-button').on('click', function() {
            $(this).toggleClass('submenu-opened');
            if ($(this).siblings('ul').hasClass('open')) {
              $(this).siblings('ul').removeClass('open').hide();
            }
            else {
              console.log("hiding 2");
              $(this).siblings('ul').addClass('open').show();
            }
          });
          */
        };

        if (settings.format === 'multitoggle') multiTg();
        else cssmenu.addClass('dropdown');

        if (settings.sticky === true) cssmenu.css('position', 'fixed');

        resizeFix = function() {

          if ($( window ).width() > 900 ) {
            cssmenu.find('.main-menu').show().addClass("open");
          }
          else {
            cssmenu.find('.main-menu').hide().removeClass("open");
            cssmenu.find('#menu-button').removeClass('menu-opened');
          }

        };
        //resizeFix();
        return $(window).on('resize', resizeFix);

      });
  };
})(jQuery);

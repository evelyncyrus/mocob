(function($, window, document, undefined) {
    'use strict';

    Mobile.libs.dropdown = {
        name: 'dropdown',

        settings: {
            active_class: 'open',
            disabled_class: 'disabled',
            mega_class: 'mega',
            align: 'bottom',
            is_hover: false,
            hover_timeout: 150,
            opened: function() {},
            closed: function() {}
        },

        init: function(scope, method, options) {
            Mobile.inherit(this, 'throttle');

            $.extend(true, this.settings, method, options);
            this.bindings(method, options);
        },

        events: function(scope) {
            var self = this,
                S = self.S;

            S(this.scope)
                .off('.dropdown')
                .on('click.dropdown', '[' + this.attr_name() + ']', function(e) {
                    var settings = S(this).data(self.attr_name(true) + '-init') || self.settings;
                    if (!settings.is_hover || 'ontouchstart' in document) {
                        e.preventDefault();
                        if (S(this).parent('[data-modal-id]').length) {
                            e.stopPropagation();
                        }
                        self.toggle($(this));
                    }
                })
                .on('click.dropdown', function(e) {
                    var parent = S(e.target).closest('[' + self.attr_name() + '-content]');
                    var links = parent.find('a');

                    if (links.length > 0 && parent.attr('aria-autoclose') !== 'false') {
                        self.close.call(self, S('[' + self.attr_name() + '-content]'));
                    }

                    if (e.target !== document && !$.contains(document.documentElement, e.target)) {
                        return;
                    }

                    if (S(e.target).closest('[' + self.attr_name() + ']').length > 0) {
                        return;
                    }

                    if (!(S(e.target).data('modalId')) &&
                        (parent.length > 0 && (S(e.target).is('[' + self.attr_name() + '-content]') ||
                            $.contains(parent.first()[0], e.target)))) {
                        e.stopPropagation();
                        return;
                    }

                    self.close.call(self, S('[' + self.attr_name() + '-content]'));
                })
                .on('opened.dropdown', '[' + self.attr_name() + '-content]', function() {
                    self.settings.opened.call(this);
                })
                .on('closed.dropdown', '[' + self.attr_name() + '-content]', function() {
                    self.settings.closed.call(this);
                });

            S(window)
                .off('.dropdown')
                .on('resize.dropdown', self.throttle(function() {
                    self.resize.call(self);
                }, 50));

            this.resize();
        },

        close: function(dropdown) {
            var self = this;
            dropdown.each(function(idx) {
                var original_target = $('[' + self.attr_name() + '=' + dropdown[idx].id + ']') || $('aria-controls=' + dropdown[idx].id + ']');
                original_target.attr('aria-expanded', 'false');
                if (self.S(this).hasClass(self.settings.active_class)) {
                    self.S(this)
                        .css('left', '-99999px')
                        .attr('aria-hidden', 'true')
                        .removeClass(self.settings.active_class)
                        .prev('[' + self.attr_name() + ']')
                        .removeClass(self.settings.active_class)
                        .removeData('target');

                    self.S(this).trigger('closed.dropdown', [dropdown]);
                }
            });
            dropdown.removeClass('act-open-' + this.attr_name(true));
        },

        closeall: function() {
            var self = this;
            $.each(self.S('.act-open-' + this.attr_name(true)), function() {
                self.close.call(self, self.S(this));
            });
        },

        open: function(dropdown, target) {
            this.css(dropdown.addClass(this.settings.active_class), target);
            dropdown.prev('[' + this.attr_name() + ']').addClass(this.settings.active_class);
            dropdown.data('target', target.get(0)).trigger('opened.dropdown', [dropdown, target]);
            dropdown.attr('aria-hidden', 'false');
            target.attr('aria-expanded', 'true');
            dropdown.focus();
            dropdown.addClass('act-open-' + this.attr_name(true));
        },

        data_attr: function() {
            if (this.namespace.length > 0) {
                return this.namespace + '-' + this.name;
            }

            return this.name;
        },

        toggle: function(target) {
            if (target.hasClass(this.settings.disabled_class)) {
                return;
            }
            var dropdown = this.S('#' + target.data(this.data_attr()));
            if (dropdown.length === 0) {
                return;
            }

            this.close.call(this, this.S('[' + this.attr_name() + '-content]').not(dropdown));

            if (dropdown.hasClass(this.settings.active_class)) {
                this.close.call(this, dropdown);
                if (dropdown.data('target') !== target.get(0)) {
                    this.open.call(this, dropdown, target);
                }
            } else {
                this.open.call(this, dropdown, target);
            }
        },

        resize: function() {
            var dropdown = this.S('[' + this.attr_name() + '-content].open');
            var target = $(dropdown.data("target"));

            if (dropdown.length && target.length) {
                this.css(dropdown, target);
            }
        },

        css: function(dropdown, target) {
            var left_offset = Math.max((target.width() - dropdown.width()) / 2, 8),
                settings = target.data(this.attr_name(true) + '-init') || this.settings;

            this.clear_idx();

            this.style(dropdown, target, settings);

            return dropdown;
        },

        style: function(dropdown, target, settings) {
            var css = $.extend({}, this.dirs[settings.align].call(dropdown, target, settings));

            dropdown.attr('style', '').css(css);
        },

        // return CSS property object
        // `this` is the dropdown
        dirs: {
            // Calculate target offset
            _base: function(t, s) {
                var o_p = this.offsetParent(),
                    o = o_p.offset(),
                    p = t.offset();

                p.top -= o.top;
                p.left -= o.left;

                //set some flags on the p object to pass along
                p.missRight = false;
                p.missTop = false;
                p.missLeft = false;
                p.leftRightFlag = false;

                //lets see if the panel will be off the screen
                //get the actual width of the page and store it
                var actualBodyWidth = window.innerWidth;

                var actualMarginWidth = (window.innerWidth - actualBodyWidth) / 2;
                var actualBoundary = actualBodyWidth;

                if (!this.hasClass('mega') && !s.ignore_repositioning) {
                    //miss top
                    if (t.offset().top <= this.outerHeight()) {
                        p.missTop = true;
                        actualBoundary = window.innerWidth - actualMarginWidth;
                        p.leftRightFlag = true;
                    }

                    //miss right
                    if (t.offset().left + this.outerWidth() > t.offset().left + actualMarginWidth && t.offset().left - actualMarginWidth > this.outerWidth()) {
                        p.missRight = true;
                        p.missLeft = false;
                    }

                    //miss left
                    if (t.offset().left - this.outerWidth() <= 0) {
                        p.missLeft = true;
                        p.missRight = false;
                    }
                }

                return p;
            },

            top: function(t, s) {
                var self = Mobile.libs.dropdown,
                    p = self.dirs._base.call(this, t, s);

                this.removeClass('drop-left drop-right').addClass('drop-top');

                if (p.missTop == true) {
                    p.top = p.top + t.outerHeight() + this.outerHeight();
                    this.removeClass('drop-top');
                }

                if (p.missRight == true) {
                    p.left = p.left - this.outerWidth() + t.outerWidth();
                }

                if (t.outerWidth() < this.outerWidth() || this.hasClass(s.mega_menu)) {
                    self.adjust_pip(this, t, s, p);
                }

                return {
                    left: p.left,
                    top: p.top - this.outerHeight()
                };
            },

            bottom: function(t, s) {
                var self = Mobile.libs.dropdown,
                    p = self.dirs._base.call(this, t, s);

                this.removeClass('drop-right drop-top drop-left');

                if (p.missRight == true) {
                    p.left = p.left - this.outerWidth() + t.outerWidth();
                }

                if (t.outerWidth() < this.outerWidth() || this.hasClass(s.mega_menu)) {
                    self.adjust_pip(this, t, s, p);
                }

                return {
                    left: p.left,
                    top: p.top + t.outerHeight()
                };
            },

            left: function(t, s) {
                var p = Mobile.libs.dropdown.dirs._base.call(this, t, s);

                this.removeClass('drop-right drop-top').addClass('drop-left');

                if (p.missLeft == true) {
                    p.left = p.left + this.outerWidth();
                    p.top = p.top + t.outerHeight();
                    this.removeClass('drop-left');
                }

                return {
                    left: p.left - this.outerWidth(),
                    top: p.top
                };
            },

            right: function(t, s) {
                var self = Mobile.libs.dropdown,
                    p = self.dirs._base.call(this, t, s);

                this.removeClass('drop-left drop-top').addClass('drop-right');

                if (p.missRight == true) {
                    p.left = p.left - this.outerWidth();
                    p.top = p.top + t.outerHeight();
                    this.removeClass('drop-right');
                } else {
                    p.triggeredRight = true;
                }

                if (t.outerWidth() < this.outerWidth() || this.hasClass(s.mega_menu)) {
                    self.adjust_pip(this, t, s, p);
                }

                return {
                    left: p.left + t.outerWidth(),
                    top: p.top
                };
            }
        },

        // Insert rule to style psuedo elements
        adjust_pip: function(dropdown, target, settings, position) {
            var sheet = Mobile.stylesheet,
                pip_offset_base = 8;

            if (dropdown.hasClass(settings.mega_class)) {
                pip_offset_base = position.left + (target.outerWidth() / 2) - 8;
            }

            this.rule_idx = sheet.cssRules.length;

            //default
            var sel_before = '.dropdown-menu.open::before',
                sel_after = '.dropdown-menu.open::after',
                css_before = 'left: ' + pip_offset_base + 'px;',
                css_after = 'left: ' + (pip_offset_base - 1) + 'px;';

            if (position.missRight == true) {
                pip_offset_base = dropdown.outerWidth() - 23;
                sel_before = '.dropdown-menu.open::before',
                    sel_after = '.dropdown-menu.open::after',
                    css_before = 'left: ' + pip_offset_base + 'px;',
                    css_after = 'left: ' + (pip_offset_base - 1) + 'px;';
            }

            //just a case where right is fired, but its not missing right
            if (position.triggeredRight == true) {
                sel_before = '.dropdown-menu.open::before',
                    sel_after = '.dropdown-menu.open::after',
                    css_before = 'left:-12px;',
                    css_after = 'left:-14px;';
            }

            if (sheet.insertRule) {
                sheet.insertRule([sel_before, '{', css_before, '}'].join(' '), this.rule_idx);
                sheet.insertRule([sel_after, '{', css_after, '}'].join(' '), this.rule_idx + 1);
            } else {
                sheet.addRule(sel_before, css_before, this.rule_idx);
                sheet.addRule(sel_after, css_after, this.rule_idx + 1);
            }
        },

        // Remove old dropdown rule index
        clear_idx: function() {
            var sheet = Mobile.stylesheet;

            if (typeof this.rule_idx !== 'undefined') {
                sheet.deleteRule(this.rule_idx);
                sheet.deleteRule(this.rule_idx);
                delete this.rule_idx;
            }
        },

        off: function() {
            this.S(this.scope).off('.dropdown');
            this.S('html, body').off('.dropdown');
            this.S(window).off('.dropdown');
            this.S('[data-dropdown-content]').off('.dropdown');
        },

        reflow: function() {}
    };
}(jQuery, window, window.document));

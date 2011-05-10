obviel.forms2 = {};

(function($, obviel, module) {
    // if no json_locale_data can be found, fall back on the default
    // translations
    if (json_locale_data === undefined) {
        var json_locale_data = undefined;
    };
    var gt = new Gettext({
        domain: "obviel_forms",
        locale_data: json_locale_data});
    function _(msgid) { return gt.gettext(msgid); };
    
    var entitize = function(s) {
        /* convert the 4 chars that must not be in XML to 'entities'
        */
        s = s.replace(/&/g, '&amp;');
        s = s.replace(/</g, '&lt;');
        s = s.replace(/>/g, '&gt;');
        s = s.replace(/"/g, '&quot;');
        return s;
    };

    // a way to determine whether an attribute name is internal
    // or not. Apparently this varies through versions of jquery
    // rather messy but I don't know of a reliable to recognize
    // a jQuery expando...
    var is_internal = function(attribute_name) {
        return (attribute_name == '__events__' ||
                attribute_name.slice(0, 6) == 'jQuery');
    };
    
    obviel.iface('viewform');

    module.Form = function(settings) {
        settings = settings || {};
        var d = {
            iface: 'viewform',
            name: 'default',
            html:
                '<form ' +
                'method="POST"' +
                '<div class="form-fields"></div>' +
                '<div class="form-error"></div>' +
                '<div class="form-controls"></div>' +
                '</form>'
        };
        $.extend(d, settings);
        obviel.View.call(this, d);
    };

    module.Form.prototype = new obviel.View;

    module.Form.prototype.render = function(el, obj, name) {
        var self = this;
    
        obj.errors = obj.errors || {};
        $(el).bind('form-change.obviel', function(ev) {
            var error_count = 0;
            $.each(obj.errors, function(key, value) {
                if (!is_internal(key) && value) {
                    error_count++;
                }
            });
            if (error_count > 0) {
                var msg = Gettext.strargs(gt.ngettext(
                    "1 field did not validate",
                    "%1 fields did not validate",
                    error_count), [error_count]);
                $('.form-error', el).text(msg);
                $('button[class="form-control"]', el).attr('disabled', 'true');
            } else {
                $('.form-error', el).text('');
                $('button[class="form-control"]', el).removeAttr('disabled');
            }
        });
        
        self.render_widgets(el, obj);
        self.render_controls(el, obj);
    };

    module.Form.prototype.render_widgets = function(el, obj) {
        var self = this;
        var is_new = false;
        if (!obj.data) {
            is_new = true;
            obj.data = {};
        }

        var form_el = $('form', el);
        var fields_el = $('.form-fields', form_el);
        var groups = obj.form.groups ? obj.form.groups.slice(0) : [];
        if (obj.form.widgets) {
            groups.unshift({
                name: null,
                widgets: obj.form.widgets
            });
        }
        var data = $(obj.data);
        
        var render_and_link = function(widget, el) {
            if (obj.form.disabled) {
                widget.disabled = true;
            }
            el.render(widget, function(el, view, widget, name) {
                // add in error area
                el.append('<div id="field-error-' + widget.name + '" '+
                          'class="field-error"></div>');
                // now link everything up
                view.link(el, widget, obj.data, obj.errors);
                // if there is a value, update the widget
                var existing_value = obj.data[widget.name];
                if (existing_value !== undefined) {
                    data.setField(widget.name, existing_value);
                } else {
                    // no value, see whether we need to set the default value
                    if (widget.defaultvalue !== undefined) {
                        data.setField(widget.name, widget.defaultvalue);
                    }
                }
            });
        };
        $.each(groups, function(index, group) {
            fields_el.append(self.render_group(group, render_and_link));
        });
    };

    module.Form.prototype.render_group = function(group, render_and_link) {
        var self = this;
        var fieldset_el;
        if (group.name) {
            fieldset_el = $(
                    '<fieldset class="form-fieldset" ' +
                    'id="form-fieldset-' + group.name +
                    '"></fieldset>');
            if (group.title) {
                fieldset_el.append(
                       '<legend>' + entitize(group.title) +
                        '</legend>');  
            }
        } else {
            fieldset_el = $('<div class="form-main-fields"></div>');
        }
        $.each(group.widgets, function(index, widget) {
            fieldset_el.append(self.render_widget(widget, render_and_link));
        });
        return fieldset_el;
    };

    module.Form.prototype.render_widget = function(widget, render_and_link) {
        var field_el = $('<div class="form-field"></div>');
        $.each(widget.ifaces, function(index, value) {
            field_el.addClass(value);
        });

        // this renders widget and links data to it
        render_and_link(widget, field_el);

        // add in label
        field_el.prepend('<label for="field-' + widget.name + '">' +
                         entitize(widget.title) +
                         '</label>');
        
        // add in description
        if (widget.description) {
            field_el.append('<div class="field-description">' +
                            entitize(widget.description) + '</div>');
        }
        // somewhat nasty, but required for a lot of style issues
        // (they need an element at the end they can rely on, and
        // the field-error div gets removed from view at times)
        field_el.append(
            '<div class="form-field-clear">&#xa0;</div>');
        return field_el;
    };

    module.Form.prototype.render_controls = function(el, obj) {
        var self = this;
        
        var form_el = $('form', el);
        var controls_el = $('.form-controls', form_el);
        var controls = obj.form.controls || [];
        
        $.each(controls, function(index, control) {
            var control_el = $('<button class="form-control" type="button" />');
            control_el.text(control.label || '');
            if (control['class']) {
                control_el.addClass(control['class']);
            }
            if (control.name) {
                control_el.attr('name', control.name);
            }
            
            control_el.click(function(ev) {
                // trigger change event for all widgets
                self.trigger_changes(obj);
                
                // determine whether there are any errors
                var error_count = 0;
                $.each(obj.errors, function(key, value) {
                    if (!is_internal(key) && value) {
                        error_count++;
                    }
                });
                if (error_count > 0) {
                    control_el.attr('disabled', 'true');
                    return;
                }

                // clone the data object removing data link annotations
                var clone = {};
                $.each(obj.data, function(key, value) {
                    if (!is_internal(key)) {
                        clone[key] = value;
                    }
                });
                var data = JSON.stringify(clone);
                
                var method = control.method || 'POST';
                var action = control.action;
                var content_type = control.content_type || 'application/json';
                var view_name = control.view_name || 'default';

                $.ajax({
                    type: method,
                    url: action,
                    data: data,
                    processData: false,
                    contentType: content_type,
                    dataType: 'json',
                    success: function(data) {
                        el.render(data, view_name);
                    }
                });
            });

            controls_el.append(control_el);
        });
    };

    module.Form.prototype.trigger_changes = function(obj) {
        // XXX this group normalization code should be generalized
        var groups = obj.form.groups ? obj.form.groups.slice(0) : [];
        if (obj.form.widgets) {
            groups.unshift({
                name: null,
                widgets: obj.form.widgets
            });
        }
        $.each(groups, function(index, group) {
            $.each(group.widgets, function(index, widget) {
                // XXX hack to look up view...
                var ifaces = obviel.ifaces(widget);
                for (var i=0; i < ifaces.length; i++) {
                    var iviews = obviel._views[ifaces[i]];
                    if (iviews) {
                        var view = iviews['default'];
                        // finally trigger change
                        view.change(widget);
                        return;
                    }
                }
            });
        });
    };
    
    obviel.view(new module.Form());

    obviel.iface('widget');

    // XXX must have a unique per form identifier, otherwise
    // if we render more than one form the field-error-<foo> ids
    // will be duplicated. this may also occur in case of repeated or
    // nested fields
    
    module.Widget = function(settings) {
        settings = settings || {};
        var d = {
            name: 'default'
        };
        $.extend(d, settings);
        obviel.View.call(this, d); 
    };

    module.Widget.prototype = new obviel.View;

    module.Widget.prototype.render = function(el, obj, name) {

    };

    module.Widget.prototype.link = function(el, widget, data, errors) {
        if (widget.disabled) {
            return;
        }
        var self = this;
        
        var link_context = {};
        var error_link_context = {};

        var convert_wrapper = function(value, source, target) {
            var result = self.handle_convert(widget, value, source, target);
            if (result.error) {
                $(errors).setField(widget.name, result.error);
                // we cannot set the value later, so return undefined
                result.value = undefined;
            } else {
                $(errors).setField(widget.name, '');
            }
            // for any update to error status, trigger event
            $(source).trigger('form-change.obviel');
            
            return result.value;
        };
        
        var convert_back_wrapper = function(value, source, target) {
            return self.handle_convert_back(widget, value, source, target);
        };
        
        link_context[widget.name] = {
            twoWay: true,
            convert: convert_wrapper,
            convertBack: convert_back_wrapper
        };
        error_link_context[widget.name] = {
            twoWay: true,
            name: 'field-error-' + widget.name,
            convertBack: function(value, source, target) {
                $(target).text(value);
            }
        };

        var field_el = $('[name=' + widget.name + ']', el);
        field_el.link(data, link_context);
        var error_el = $('.field-error', el);
        error_el.link(errors, error_link_context);
    };

    module.Widget.prototype.handle_convert = function(widget, value,
                                                      source, target) {
        var self = this;
        // try to convert original form value
        var result = self.convert(widget, value, source, target);
        if (result.error !== undefined) {
            // conversion error, so bail out
            return {
                error: result.error,
                value: value
            };
        }

        // this is the converted value, now validate it
        value = result.value;
        var error = self.validate(widget, value);
        if (error !== undefined) {
            // validation error, so bail out
            return {
                error: error,
                value: value
            };
        }

        // conversion and validation both succeeded
        return {
            value: value
        };
    };

    module.Widget.prototype.handle_convert_back = function(widget, value,
                                                          source, target) {
        var self = this;
        return self.convert_back(widget, value, source, target);
    };
    
    module.Widget.prototype.convert = function(widget, value) {
        return {value: value};
    };

    module.Widget.prototype.convert_back = function(widget, value) {
        return value;
    };

    module.Widget.prototype.validate = function(widget, value) {
        if (!widget.validate) {
            widget.validate = {};
        }
        return undefined;
    };

    module.Widget.prototype.change = function(widget) {
        // notify that this widget changed, may need specific implementation
        // in subclasses but this is fairly generic
        var field_el = $('#field-' + widget.name);
        var ev = new $.Event('change');
        ev.target = field_el;
        field_el.trigger(ev);
    };

    obviel.iface('composite_widget', 'widget');
    // base for composite widgets combining other widgets
    module.CompositeWidget = function(settings) {
        settings = settings || {};
        var d = {
            iface: 'composite_widget'
        };
        // horizontal or vertical rendering support?
        $.extend(d, settings);
        module.Widget.call(this, d);
    };

    module.CompositeWidget.prototype = new module.Widget;

    module.CompositeWidget.prototype.render = function(el, obj, name) {
 
    };

    module.CompositeWidget.prototype.link = function(el, widget, obj) {

    };
    
    obviel.iface('input_field', 'widget');
    module.InputWidget = function(settings) {
        settings = settings || {};
        var d = {
            iface: 'input_field',
            jsont:
                '<div class="field-input">' +
                '<input type="text" name="{name}" id="field-{name}" ' +
                'style="{.section width}width: {width}em;{.end}" ' +
                '{.section validate}' +
                '{.section max_length}' +
                'maxlength="{max_length}" ' +
                '{.end}' +
                '{.end}' +
                '{.section disabled}' +
                'disabled="disabled" ' +
                '{.end} />' +
                '</div>'
        };
        $.extend(d, settings);
        module.Widget.call(this, d);        
    };
    
    module.InputWidget.prototype = new module.Widget;

    module.InputWidget.prototype.convert = function(widget, value) {
        if (value === '') {
            return {value: null};
        }
        return module.Widget.prototype.convert.call(this, widget, value);
    };

    module.InputWidget.prototype.convert_back = function(widget, value) {
        if (value === null) {
            return '';
        }
        return module.Widget.prototype.convert_back.call(this, widget, value);
    };

    module.InputWidget.prototype.validate = function(widget, value) {
        var error = module.Widget.prototype.validate.call(this, widget, value);
        // this can never happen but in subclasses it can, so it's
        // useful there when deriving from InputWidget
        //if (error !== undefined) {
        //    return error;
        //}
        if (widget.validate.required && value === null) {
            return _('this field is required');
        }
        return undefined;
    };
    
    obviel.iface('textline_field', 'input_field');

    module.TextLineWidget = function(settings) {
        settings = settings || {};
        var d = {
            iface: 'textline_field'
        };
        $.extend(d, settings);
        module.InputWidget.call(this, d);
    };

    module.TextLineWidget.prototype = new module.InputWidget;

    module.TextLineWidget.prototype.validate = function(widget, value) {
        var error = module.InputWidget.prototype.validate.call(this, widget, value);
        if (error !== undefined) {
            return error;
        }
        // if the value is empty and isn't required we're done
        if (value === null && !widget.validate.required) {
            return undefined;
        }
        
        if (widget.validate.min_length &&
            value.length < widget.validate.min_length) {
            return _('value too short');
        } else if (widget.validate.max_length &&
                   value.length > widget.validate.max_length) {
            return _('value too long');
        };

        if (widget.validate.regs) {
            $.each(widget.validate.regs, function(index, reg) {
                var regexp = RegExp(reg.reg); // no flags?
                var result = regexp.exec(value);
                if (!result) {
                    error = reg.message;
                    return false;
                }
                return true;
            });
        }
        // return error; if there was a problem with the regex validation
        // that error message will be returned, otherwise undefined, meaning
        // no error
        return error;
    };

    obviel.view(new module.TextLineWidget());

    // text field (textarea)
    // even though we subclass input field, we are going to
    // reuse textline_field for most of its behavior
    obviel.iface('text_field', 'input_field');
    module.TextWidget = function(settings) {
        settings = settings || {};
        var d = {
            iface: 'text_field',
            jsont:
            '<div class="field-input">' +
            '<textarea name="{name}" id="field-{name}"' +
            ' style="{.section width}width: {width}em;{.end}' +
            '{.section height}height: {height}em;{.end}"' +
            '{.section disabled} disabled="disabled"{.end}>' +
            '</textarea>' +
            '</div>'
        };
        $.extend(d, settings);
        module.TextLineWidget.call(this, d);
    };

    module.TextWidget.prototype = new module.TextLineWidget;
    obviel.view(new module.TextWidget());
    
    obviel.iface('integer_field', 'input_field');
    module.IntegerWidget = function(settings) {
        settings = settings || {};
        var d = {
            iface: 'integer_field'
        };
        $.extend(d, settings);
        module.InputWidget.call(this, d);
    };

    module.IntegerWidget.prototype = new module.InputWidget;

    module.IntegerWidget.prototype.convert = function(widget, value) {
        if (value === '') {
            return {value: null};
        }
        var asint = parseInt(value);
        if (isNaN(asint)) {
            return {error: _("not a number")};
        }
        if (asint != parseFloat(value)) {
            return {error: _("not an integer number")};
        }
        return {value: asint};
    };

    module.IntegerWidget.prototype.convert_back = function(widget, value) {
        value = module.InputWidget.prototype.convert_back.call(this, widget, value);
        return value.toString();
    };
 
    module.IntegerWidget.prototype.validate = function(widget, value) {
        var error = module.InputWidget.prototype.validate.call(this, widget, value);
        if (error !== undefined) {
            return error;
        }
        // if the value is empty and isn't required we're done
        if (value === null && !widget.validate.required) {
            return undefined;
        }

        if (!widget.validate.allow_negative && value < 0) {
            return _('negative numbers are not allowed');
        }
        if (widget.validate.length !== undefined) {
            var asstring = value.toString();
            if (asstring[0] == '-') {
                asstring = asstring.slice(1);
            }
            if (asstring.length != widget.validate.length) {       
                return Gettext.strargs(_('value must be %1 digits long'),
                                       [widget.validate.length]);
            }
        }
        return undefined;
    };
    obviel.view(new module.IntegerWidget());

    
    var is_decimal = function(sep, value) {
        var reg = '^[-]?([0-9]*)([' + sep + ']([0-9]*))?$';
        return (new RegExp(reg)).exec(value);
    };

    obviel.iface('float_field', 'input_field');
    module.FloatWidget = function(settings) {
        settings = settings || {};
        var d = {
            iface: 'float_field'
        };
        $.extend(d, settings);
        module.InputWidget.call(this, d);
    };

    module.FloatWidget.prototype = new module.InputWidget;

    module.FloatWidget.prototype.convert = function(widget, value) {
        if (value === '') {
            return {value: null};
        }
        // XXX converter is getting information from validate,
        // but keep this for backwards compatibility
        widget.validate = widget.validate || {};
        var sep = widget.validate.separator || '.';

        if (!is_decimal(sep, value)) {
            return {error: _("not a float")};
        }
        if (sep != '.') {
            value = value.replace(sep, '.');
        }
        var asfloat = parseFloat(value);
        if (isNaN(asfloat)) {
            return {error: _("not a float")};
        }
        return {value: asfloat};
    };

    module.FloatWidget.prototype.convert_back = function(widget, value) {
        value = module.InputWidget.prototype.convert_back.call(this, widget, value);
        value = value.toString();
        widget.validate = widget.validate || {};
        var sep = widget.validate.separator || '.';
        if (sep != '.') {
            value = value.replace('.', sep);
        }
        return value;
    };
 
    module.FloatWidget.prototype.validate = function(widget, value) {
        var error = module.InputWidget.prototype.validate.call(this, widget, value);
        if (error !== undefined) {
            return error;
        }
        // if the value is empty and isn't required we're done
        if (value === null && !widget.validate.required) {
            return undefined;
        }

        if (!widget.validate.allow_negative && value < 0) {
            return _('negative numbers are not allowed');
        }
        return undefined;
    };
    obviel.view(new module.FloatWidget());

    obviel.iface('decimal_field', 'input_field');
    module.DecimalWidget = function(settings) {
        settings = settings || {};
        var d = {
            iface: 'decimal_field'
        };
        $.extend(d, settings);
        module.InputWidget.call(this, d);
    };

    module.DecimalWidget.prototype = new module.InputWidget;
    
    module.DecimalWidget.prototype.convert = function(widget, value) {
        if (value === '') {
            return {value: null};
        }
        // XXX converter is getting information from validate,
        // but keep this for backwards compatibility
        widget.validate = widget.validate || {};
        var sep = widget.validate.separator || '.';

        if (!is_decimal(sep, value)) {
            return {error: _("not a decimal")};
        }
        
        // normalize to . as separator
        if (sep != '.') {
            value = value.replace(sep, '.');
        }
        // this may be redunant but can't hurt I think
        var asfloat = parseFloat(value);
        if (isNaN(asfloat)) {
            return {error: _("not a decimal")};
        }
        // we want to return the string as we don't want to
        // lose precision due to rounding errors
        return {value: value};
    };

    module.DecimalWidget.prototype.convert_back = function(widget, value) {
        value = module.InputWidget.prototype.convert_back.call(this, widget, value);
        widget.validate = widget.validate || {};
        var sep = widget.validate.separator || '.';
        if (sep != '.') {
            value = value.replace('.', sep);
        }
        return value;
    };
 
    module.DecimalWidget.prototype.validate = function(widget, value) {
        var error = module.InputWidget.prototype.validate.call(this, widget, value);
        if (error !== undefined) {
            return error;
        }
        // if the value is empty and isn't required we're done
        if (value === null && !widget.validate.required) {
            return undefined;
        }

        if (!widget.validate.allow_negative && value[0] == '-') {
            return _('negative numbers are not allowed');
        }
        
        var parts = value.split('.');
        var before_sep = parts[0];
        var after_sep;
        if (parts.length > 1) {
            after_sep = parts[1];
        } else {
            after_sep = '';
        };

        if (before_sep[0] == '-') {
            before_sep = before_sep.slice(1);
        }

        var min_before_sep = widget.validate.min_before_sep;
        
        if (min_before_sep !== undefined &&
            before_sep.length < min_before_sep) {
            return Gettext.strargs(
                _('decimal must contain at least %1 digits before the decimal mark'),
                [min_before_sep]);
        }
        var max_before_sep = widget.validate.max_before_sep;
        if (max_before_sep !== undefined &&
            before_sep.length > max_before_sep) {
            return Gettext.strargs(
                _('decimal may not contain more than %1 digits before the decimal mark'),
                [max_before_sep]);
        }

        var min_after_sep = widget.validate.min_after_sep;
        if (min_after_sep !== undefined &&
            after_sep.length < min_after_sep) {
            return Gettext.strargs(
                _('decimal must contain at least %1 digits after the decimal mark'),
                [min_after_sep]);
        }

        var max_after_sep = widget.validate.max_after_sep;
        if (max_after_sep != undefined &&
            after_sep.length > max_after_sep) {
            return Gettext.strargs(
                _('decimal may not contain more than %1 digits after the decimal mark'),
                [max_after_sep]);
        }
        return undefined;
    };
    
    obviel.view(new module.DecimalWidget());

    obviel.iface('boolean_field', 'widget');

    module.BooleanWidget = function(settings) {
        settings = settings || {};
        var d = {
            iface: 'boolean_field',
            jsont:
            '<div class="field-input">' +
            '{.section label}{.section label_before_input}{label}' +
            '{.end}{.end}' +
            '<input type="checkbox" name="{name}" id="field-{name}"' +
            '{.section disabled} disabled="disabled"{.end} />' +
            '{.section label}{.section label_before_input}{.or}{label}' +
            '{.end}{.end}</div>'
        };
        $.extend(d, settings);
        module.Widget.call(this, d);
    };

    module.BooleanWidget.prototype = new module.Widget;

    module.BooleanWidget.prototype.convert = function(widget, value,
                                                      source, target) {
        return {value:$(source).is(':checked')};
    };

    module.BooleanWidget.prototype.convert_back = function(widget, value,
                                                           source, target) {
        $(target).attr('checked', value);
    };
    
    obviel.view(new module.BooleanWidget());

    obviel.iface('choice_field', 'widget');
    
    module.ChoiceWidget = function(settings) {
        settings = settings || {};
        var d = {
            iface: 'choice_field',
            jsont:
            '<div class="field-input">' +
            '<select name="{name}" id="field-{name}"' +
            ' style="{.section width}width: {width}em;{.end}"' +
            '{.section disabled} disabled="disabled"{.end}>' +
            '{.section empty_option}' +
            '<option value="">{empty_option|htmltag}</option>{.end}' +
            '{.repeated section choices}' +
            '<option value="{value|htmltag}">{label|htmltag}</option>' +
            '{.end}</select></div>'
        };
        $.extend(d, settings);
        module.Widget.call(this, d);
    };

    module.ChoiceWidget.prototype = new module.Widget;

    module.ChoiceWidget.prototype.render = function(el, widget, name) {
        widget.validate = widget.validate || {};
        if (!widget.validate.required &&
            (widget.empty_option === undefined) &&
            (widget.choices.length && widget.choices[0].value)) {
            $('select', el).prepend('<option></option>');
        }
    };
    
    module.ChoiceWidget.prototype.convert = function(widget, value) {
        if (!value) {
            return {value: null};
        }
        return {value: value};
    };

    module.ChoiceWidget.prototype.convert_back = function(widget, value) {
        if (value === null) {
            return '';
        }
        return value;
    };
    
    obviel.view(new module.ChoiceWidget());
    
})(jQuery, obviel, obviel.forms2);

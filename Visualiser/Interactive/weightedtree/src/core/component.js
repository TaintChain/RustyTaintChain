/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.

 MIT LICENSE:

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 IN THE SOFTWARE.
 */

// @version 1.1.54


/**
 * This class is the work horse of all vizuly.core.components.  Each vizuly.core.component implements this class to create a standard vizuly object.   This class is only used by developers creating their own vizuly.core.components.
 *
 * The input parameters defined below are used to create a self contained function chained object with public accessors, protected properties, and event emitters.
 * A container DOM element (HTML DIV Element) is also created and appended to the parent element for subsequent rendering by the vizuly.core.component implementing this class.
 *
 *  * The following events for common UI interactions will automatically be created:
 *
 *  *mouseover, mouseout, mousedown, click, dblclick, touch, zoom, zoomstart, zoomend*
 *
 * * The following events for the component lifecycle will be automatically created:
 *
 *  *initialize, validate, measure, update*
 *
 * * For each public property passed in via the *props* param, a data change event will be created in the following format
 *   *propName_change*
 *
 * @class
 * @constructor
 * @param {DOMElement} parent - DOM Element that the component DIV Element will be appended to.
 * @param {Object} scope - This object is passed into the constructor and will be populated with the dynamically generated accessors, properties, and event dispatcher.  The *scope* object is what component developers use internall to their components to access all protected properties, methods, and events.
 * @param {Array} props - An array of strings (*['propertyA', 'propertyB', 'propertyC']*) representing all public accessors with associated protected properties (*scope.propertyA*)
 * @param {Array} events - An array of strings (*['customEventA', 'customEventB', 'customEventC']*) representing any custom events that the component will emit via *scope.dispatch*
 *
 * @fires mouseover
 * @fires mouseout
 * @fires mousedown
 * @fires click
 * @fires dblclick
 * @fires touch
 * @fires zoom
 * @fires zoomstart
 * @fires zoomend
 *
 * @fires initialize
 * @fires validate
 * @fires measure
 * @fires update
 *
 * @fires prop_change
 */
vizuly.core.component = function(parent,scope,props,events) {

    //We set the primary scope properties
    scope.parent = parent;
    scope.properties = props;
    scope.id = vizuly.core.util.guid();
    scope.selection = d3.select(parent).append("div").attr("id","div_" + scope.id).style("width","100%").style("height","100%");

    // Adding our dispatch event that the viz will use for any attached callbacks.
    var args=[];

    // Interaction events
    args.push("mouseover")
    args.push("mouseout");
    args.push("mousedown");
    args.push("click");
    args.push("dblclick");
    args.push("touch");
    args.push("zoom");
    args.push("zoomstart");
    args.push("zoomend");

    // Core events
    args.push("initialize");
    args.push("validate");
    args.push("measure");
    args.push("update");

    // Property (from the 'props' array) "_change" events
    // This way anyone can listen for any specific (like data) viz property changes
    Object.getOwnPropertyNames(props).forEach(function (val, idx, array) {
        args.push(val + "_change");
    });

    // Add any custom events that the component may need.
    if (events && events.length > 0) {
        events.forEach(function (d) {
            args.push(d);
        })
    }

    // Sets up all of our dispatch calls by attaching a d3.dispatch to the scope variable
    // For more info on dispatch, see here: https://github.com/mbostock/d3/wiki/Internals#d3_dispatch
    scope.dispatch = d3.dispatch.apply(this,args);

    //For each property in our 'props' array create a callback if the property value has changed.
    function setProps(component,scope,props) {
        Object.getOwnPropertyNames(props).forEach(function (val, idx, array) {
            if (typeof (scope[val]) == "undefined") {
                scope[val] = props[val];
                component[val] = function (_) {
                    if (!arguments.length) {
                        return scope[val];
                    }
                    else {
                        var oldVal = scope[val];
                        scope[val] = _;
                        if (scope[val] !== oldVal) {
                            scope.dispatch[val + "_change"].apply(this,[scope[val],oldVal]);  //Broadcast for public events
                        }
                    }
                    return component;
                }
            }
        });
    };

    var component = function () {
        setProps(component,scope,scope.properties);
        return component;
    };

    //Attach our component to the disptach object so we have it later on any event
    scope.dispatch.component = component();

    /**
     *  Returns a unique identifier that has been auto generated at instantiation.
     *  @memberOf vizuly.core.component
     */
    component.id = function () {
        return scope.id;
    }

    /**
     *  Returns the D3 selection of component DIV container.
     *  @memberOf vizuly.core.component
     */
    component.selection = function () {
        return scope.selection;
    };

    /**
     * This method accepts the following two parameters which allow you to capture any component generated events.
     *  @memberOf vizuly.core.component
     *  @function
     *  @param {String} event of event to be listened for
     *  @param {Function} listener function used to capture emited event
     */
    component.on = function (event,listener) {
        scope.dispatch.on(event,listener);
        return component;
    };

    /**
     *  Validates that all public properties (passed in *props* param) have non null values.
     *
     *  This method is usually called internally from a vizuly.core.component.
     *  @memberOf vizuly.core.component
     */
    component.validate = function () {
        if (invalid) return;

        var invalid = []
        Object.getOwnPropertyNames(props).forEach(function (val) {
            if (!scope[val] && Number(scope[val] != 0)) {
                invalid.push(val);
            }
        })
        if (invalid.length > 0) {
            throw new Error("vizuly.core.util.component.validate(): " + invalid.concat() + " need to be declared");
        }

        //We disptach a 'validate' event so we can hook in callbacks before other work is done.
        scope.dispatch.validate();
    }

    //Return our finished component.
    return scope.dispatch.component;
};
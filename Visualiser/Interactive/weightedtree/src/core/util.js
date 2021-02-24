/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.

 MIT LICENSE:

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 IN THE SOFTWARE.
 */

// @version 1.1.54

/**
 * @class
 */
vizuly.core.util = {};


/**
 * This function converts margin absolute or relative (%) values with a specified width/height into
 * a size object that has the following properties: size.top, size.left, size.height, size.width.
 * This function is used by many of the components and skins to quickly get layout measurements.
 * @example
 *
 * var margin = {top: 10, bottom:10, left:'10%', right: '10%'}
 * var size = vizuly.core.util.size(margin, 500, 500);
 *
 * //size.width == 400
 * //size.height == 480
 * //size.left == 50
 * //size.top == 10
 *  @function
 *  @param {object} margin - object in this format *{top:10, bottom:10, right:10, left:10}*
 *  @param {Number} width - measured in pixels
 *  @param {Number} height - measured in pixels
 *  @returns {object} Size object in this format: *{top:10, left:10, width:100, height:100}*
 */
vizuly.core.util.size = function (margin,width,height) {

    var size={};
    
    size.width = width - vizuly.core.util.measure(margin.left,width) - vizuly.core.util.measure(margin.right,width);
    size.height = height - vizuly.core.util.measure(margin.top,height) - vizuly.core.util.measure(margin.bottom,height);
    size.top = vizuly.core.util.measure(margin.top,height);
    size.left = vizuly.core.util.measure(margin.left,width);
    size.bottom = vizuly.core.util.measure(margin.bottom,height);
    size.right = vizuly.core.util.measure(margin.right,width);

    return size;
}

/**
 * This function creates a scale based on the value being passed into it.
 * It will default to a linear scale if the incoming value is not a string or a date
 * This solves 80% of the use cases for setting up a scale, other use cases can be handled individually at the component
 * or application level
 *  @function
 *  @param {number|string|date} value - Used to determine which type of scale to create.
 *  @returns {d3.scale.linear|d3.scale.ordinal|d3.time.scale }
 */
vizuly.core.util.getTypedScale = function (value) {
        var scale;
        if (typeof value == "string") {
            scale = d3.scale.ordinal();
        }
        else if (value instanceof Date) {
            scale = d3.time.scale();
        }
        else {
            scale= d3.scale.linear();
        }
        return scale;
}

/**
 * This function sets a scale's range based on min and max values, and
 * uses range bands if the scale is an ordinal scale (assumed by string value in the scale domain -
 * as class equality is not supported in javascript outside of using protoype chains (which we don't use.)
 *  @function
 *  @param {d3.scale} scale - the scale that will have its range set.
 *  @param {d3.scale} min - the minimum value
 *  @param {d3.scale} max - the maximum value
 */
vizuly.core.util.setRange = function (scale,min,max) {
    if (typeof(scale.domain()[0]) == "string") {
        scale.rangeBands([min,max],0);
    }
    else {
        scale.range([min,max]);
    }
}


/**
 * This function will see if we are using a relative (%) value against a given measure
 * If we are it calculates the percentage value and returns that
 * If we aren't it just returns the original m0 parameter
 * This is primarily used by the vizuly.core.util.size function.
 * @example
 *
 * var width = vizuly.core.util.measure(100,100);
 * //width == 100;
 *
 * var width = vizul.util.measure('50%',100);
 * //width == 50;
 *  @function
 *  @param {number|string} m0 - The value we want to get a measur
 *  @param {m1} min - The comparison value we use if we want a relative (%) measure.
 *  @returns {Number} The return value.
 */
vizuly.core.util.measure = function (m0,m1) {
    if(typeof m0 == "string" && m0.substr(m0.length-1) == "%") {
        var r = Math.min(Number(m0.substr(0,m0.length-1)),100)/100;
        return (Math.round(m1 * r));
    }
    else return m0;
};


/**
 * This function generates a unique identifier used by all vizuly.core.components in their DOM id.
 *  @memberOf vizuly.core.util
 *  @function
 */
vizuly.core.util.guid = function()
{
    /* REAL GUID
     return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
     var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
     return v.toString(16);
     });
     */

    //Simple ID that is unique enough for an DOM tree.
    return 'vzxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};


/**
 * This function will get a reference to the svg.defs element within a component (assumes only one SVG element)
 * If no def's element is present it will create one
 *  @param {vizuly.core.component} viz - the vizuly.core.component being referenced.
 *  @function
 *  @returns {d3.selection} svg 'defs' selection.
 */
vizuly.core.util.getDefs = function (viz) {
    var defs = viz.selection().selectAll("svg defs");
    if (defs[0].length < 1)
        defs = viz.selection().select("svg").append("defs");
    return defs;
}


/**
 * This function will convert a string to a CSS friendly key.
 *  @param {String} s - the string to be converted
 *  @function
 *  @returns {String} CSS friendly key
 */
vizuly.core.util.createCSSKey = function(s) {
    s = String(s).replace(",", "_");
    s = s.replace(/[\s+,'+,\.,\(,\),\"]/g, "");
    s = "css" + s.toUpperCase();
    return s;
}


/**
 * This function will take a D3.nest and perform rollup aggregtations against a given set of properties.
 * This is useful for working with hiearhcal data where you want to perform various calculations on properties at each level of the hierarchy.
 *
 * Warning:  This function will mutate the nest by appending new object properties to each object with the following naming convention
 *
 * obj.myProp --> obj.agg_myProp
 *
 * @example
 * var nest = d3.nest()
 *   .key(function (d) { return d.Level1; })
 *   .key(function (d) { return d.Level2; })
 *   .key(function (d) { return d.Level3; })
 *   .entries(values);
 *
 * vizuly.core.util.aggregateNest(nest, ['propertyA','propertyB'], function (a, b) {
 *      return Number(a) + Number(b);
 * });
 *
 * //nest[0].propertyA == 10
 * //nest[0].agg_propertyA == 100;
 *
 *  @param {d3.nest} nest - A d3.nest() result.
 *  @param {array} properties - A list of object property names.
 *  @param {function} calculation - The function that will peform the aggregation calculation. (i.e. sum, mean, avg. etc..)
 */
vizuly.core.util.aggregateNest = function(nest, properties, calculation) {

    //Go down to the last depth and get source values so we can roll them up t

    var deepestChildNode = nest[0];

    while (deepestChildNode.values) {
        deepestChildNode = deepestChildNode.values[0]
    }

    var childProperties = [];

    Object.getOwnPropertyNames(deepestChildNode).forEach(function (name) {
        childProperties.push(name);
    })

    aggregateNodes(nest);

    function setSourceFields(child, parent) {
        if (parent) {
            for (var i = 0; i < childProperties.length; i++) {
                var childProperty = childProperties[i];
                if (child[childProperty] != undefined) {
                    child["childProp_" + childProperty] = child[childProperty];
                }
                parent["childProp_" + childProperty] = (child["childProp_" + childProperty]) ? child["childProp_" + childProperty] : child[childProperty];
            }
        }
    }

    function aggregateNodes(nodes,parent) {
        for (var y = 0; y < nodes.length; y++) {
            var node = nodes[y];
            if (node.values) {
                aggregateNodes(node.values,node);
                for (var z = 0; z < node.values.length; z++) {
                    var child = node.values[z];
                    for (var i = 0; i < properties.length; i++) {
                        if (isNaN(node["agg_" + properties[i]])) node["agg_" + properties[i]] = 0;
                        node["agg_" + properties[i]] = calculation(node["agg_" + properties[i]], child["agg_" + properties[i]]);
                    }
                }
            }
            else {
                for (var i = 0; i < properties.length; i++) {
                    node["agg_" + properties[i]] = Number(node[properties[i]]);
                    if (isNaN(node["agg_" + properties[i]])) {
                        node["agg_" + properties[i]] = 0;
                    }
                }
            }
            setSourceFields(node, parent);
        }
    }

}

/**
 * This static function is used to dynamically generate dates on a zoomable axis with the following levels of granularity
 *
 * *Year, Month, Mon & Day*
 *
 * *2016, June, Jun 18*
 *
 */
vizuly.core.util.format_YEAR_Mon_MonDay = d3.time.format.multi([
    [".%L", function (d) { return d.getMilliseconds(); }],
    [":%S", function (d) {  return d.getSeconds(); }],
    ["%I:%M", function (d) {  return d.getMinutes(); }],
    ["%I %p", function (d) {  return d.getHours(); }],
    ["%a %d", function (d) { return d.getDay() && d.getDate() != 1; }],
    ["%b %d", function (d) { return d.getDate() != 1; }],
    ["%b", function (d) { return d.getMonth(); }],
    ["20%y", function (d) { return true; }]
]);

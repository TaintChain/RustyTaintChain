/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.

 This source code is covered under the following license: http://vizuly.io/commercial-license/

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// @version 1.1.54

vizuly.skin.SCATTER_NEON = "Neon";
vizuly.skin.SCATTER_FIRE = "Fire";
vizuly.skin.SCATTER_OCEAN = "Ocean";
vizuly.skin.SCATTER_SUNSET = "Sunset";
vizuly.skin.SCATTER_BUSINESS = "Business";

//
// Vizuly themes are responsible for creating the look and feel of each component.   They do this by using d3 to select
// a subset of DOM display elements that the viz has created and applying styles and altering properties directly on
// those elements.   Themes can also respond to user interactions to alter the look and feel of various display elements.
//
// At run-time, a theme requires a viz in its constructor, as it is designed to operate on one viz at a time.  The theme
// operates directly on the DOM (usually SVG) elements outputted from the viz.   If a developer changes
// the viz output they will most likely need to alter the theme.   A viz has no dependency on a theme, but a theme has a
// direct dependency on a viz.
//
// Every theme implements one or more skins (see the skin objects at the end of this file.)  Each skin is collection of
// common properties and functions that are applied at run time to the viz output.  This allows the developer to quickly
// create new skins, that can change the look and feel without having to worry about the specifics of the implementation.
// A skin may also have a css class name associated with it, so static styles can be applied via an associated component
// stylesheet.
//
// If the developer wants a significantly different look and feel, or response to user input, they can either create a
// whole new theme (and related skins) or modify the stock one.
//
// All themes implement the same object life-cycle as described below:
//
// instantiation - requires a viz so it can implement look and feel changes
// applyCallBacks - binds callbacks to the viz events so it can apply style and property changes as the viz output changes
// applyTheme - takes properties from the selected skin and applies it to the viz output
// onMyEvent - a set of callbacks that change output depending on the event emitted by the component.
// release - unbind any callbacks, undo any display element changes, and release the viz.
// For a more thorough explanation, read here:
//
// http://vizuly.io/docs-themes-and-skins/
//
// Please note:  Themes are optimized for readability customization, NOT performance. For instance, you may want to create
// a mobile version of a theme that is optimized for performance and doesn't use gradients and filters,
// which can slow down rendering.  Or you may want to create a theme purely in a css style sheet and doesn't repeatedly
// select DOM elements on every event from the viz.
//

vizuly.theme.scatter = function (viz) {

    // This is the viz we will be styling
    var viz = viz;

    // This is the holder for the active skin
    var skin = null;

    // Some meta information for the skins to use in styling
    var backgroundGradient = vizuly.svg.gradient.blend(viz, "#000", "#000");

    // We put the callbacks in an array so we can keep track of them when we need to release the viz
    var callbacks = [
        {on: "measure.theme",callback: onMeasure},
        {on: "update.theme",callback: applyTheme},
        {on: "mouseover.theme",callback: onMouseOver},
        {on: "mouseout.theme",callback: onMouseOut}
    ];

    // Create our function chained theme object
    theme();

    function theme() {
        // Bind our callbacks
        applyCallbacks();
    }


    function applyTheme() {

        // If we don't have a skin we want to exit - as there is nothing we can do.
        if (!skin) return;

        // Viz measurements
        var w = viz.width();
        var sw = Math.min(viz.width(),viz.height())/80;

        // Grab the d3 selection from the viz so we can operate on it.
        var selection = viz.selection();

        // Set our skin class
        selection.attr("class",skin.class);

        // Update the background
        selection.selectAll(".vz-background").attr("fill", function () {
            return "url(#" +  backgroundGradient.attr("id") + ")";
        });

        // Hide the plot background
        selection.selectAll(".vz-plot-background").style("opacity", 0);

        // Update the bottom axis
        selection.selectAll(".vz-scatter-bottom-axis")
            .style("font-weight", skin.xAxis_font_weight)
            .style("fill", skin.labelColor)
            .style("font-size", Math.max(8, Math.round(w / 85)) + "px")
            .style("opacity", function () { return w > 399 ? 1 : 0 });

        // Update the left axis
        selection.selectAll(".vz-scatter-left-axis line")
            .style("stroke", skin.yAxis_line_stroke)
            .style("stroke-width", 1)
            .style("opacity", skin.yAxis_line_opacity);

        // Update the left axis text
        selection.selectAll(".vz-scatter-left-axis text")
            .style("font-size", Math.max(8, Math.round(w / 85)) + "px")
            .style("fill", skin.labelColor)
            .style("fill-opacity", .6);

        // Update the scatter plots
        selection.selectAll(".vz-scatter-node")
            .style("stroke-width",sw)
            .style("stroke-opacity",0)
            .style("stroke",function (d,i) { return skin.node_stroke(d,i)})
            .style("fill",function (d,i) { return skin.node_fill(d,i)})
            .style("fill-opacity",function (d,i) { return skin.node_fill_opacity(d,i)})

        // Transition our background
        skin.background_transition();
    }

    // On each measure event set the correct width and orientation of each axis
    function onMeasure() {
        viz.yAxis().tickSize(-vizuly.core.util.size(viz.margin(), viz.width(), viz.height()).width).orient("left");
        viz.xAxis().tickSize(-vizuly.core.util.size(viz.margin(), viz.width(), viz.height()).width);
    }

    // Fires on each mouse over event
    function onMouseOver(e,d,i) {

        // Reduce opacity of all nodes
        viz.selection().selectAll(".vz-scatter-node")
            .style("opacity",0.15);

        // Higlight the opacity of the selected node.
        d3.select(e).style("opacity",1)
            .style("stroke-opacity",.5)
            .style("fill-opacity",.9);

        //
        dispatch.mouseover(e,d,i);

    }

    // Fires on each mouse out
    function onMouseOut(e,d,i) {

        // Return selected node to correct opacity
        d3.select(e).style("opacity",1)
            .style("fill-opacity",function (d,i) { return skin.node_fill_opacity(d,i)});

        // Return all nodes to correct opacity
        viz.selection().selectAll(".vz-scatter-node")
            .style("stroke-opacity",0)
            .style("opacity",1)
    }

    // Utility to transition background
    function materialBackground() {
        viz.selection().selectAll(".vz-background").style("fill-opacity", 1);
        backgroundGradient.selectAll("stop")
            .transition().duration(500).attr("stop-color", function (d, i) {
                return (i == 0) ? skin.grad0 : skin.grad1;
            });
    }

    // Our primary external function that fires the "apply" function.
    theme.apply = function (skin) {
        if (arguments.length > 0)
            theme.skin(skin);
        applyTheme();
        return theme;
    }

    // Binds all of our theme callbacks to the viz.
    function applyCallbacks() {
        callbacks.forEach(function (d) {
            viz.on(d.on, d.callback);
        });
    }

    // Removes viz from skin
    theme.release = function () {
        if (!viz) return;
        viz.selection().attr("class",null);
        callbacks.forEach(function (d) {
            viz.on(d.on, null);
        })
        viz=null;
    };

    // Returns the selected viz or sets one and applies the callbacks
    theme.viz = function (_) {
        if (!arguments.length) {
            return viz;
        }
        viz = _;
        applyCallbacks();
    }

    // Sets the skin for the theme
    theme.skin = function (_) {
        if (arguments.length == 0) {
            return skin;
        }
        if (skins[_])
            skin = skins[_];
        else
            throw new Error("theme/linearea.js - skin " + _ + " does not exist.");

        return theme;
    }

    // Returns all of the skins
    theme.skins = function () {
        return skins;
    }

    // This theme allows for callbacks on internal events so any additional style/property changes
    // can be applied AFTER the theme has done its own changes
    var dispatch = d3.dispatch("mouseover","mouseout");
    theme.on = function (event,listener) {
        dispatch.on(event,listener);
        return theme;
    };

    var skins = {
        Fire: {
            name: "Fire",
            labelColor: "#FFF",
            labelFill: "#C50A0A",
            stroke_colors:  ["#C50A0A", "#C2185B", "#F57C00", "#FF9800", "#FFEB3B"],
            fill_colors: ["#C50A0A", "#C2185B", "#F57C00", "#FF9800", "#FFEB3B"],
            grad0: "#000000",
            grad1: "#474747",
            background_transition: materialBackground,
            yAxis_line_stroke: "#FFF",
            yAxis_line_opacity: 0.25,
            node_stroke: function (d, i) {
                return this.stroke_colors[i % 5];
            },
            node_fill: function (d, i) {
                return this.fill_colors[i % 5];
            },
            node_fill_opacity: function (d, i) {
                return .5;
            },
            class: "vz-skin-fire"
        },
        Sunset: {
            name: "Sunset",
            labelColor: "#FFF",
            labelFill: "#00236C",
            stroke_colors: ["#CD57A4", "#B236A3", "#FA6F7F", "#FA7C3B", "#E96B6B"],
            fill_colors: ["#89208F", "#C02690", "#D93256", "#DB3D0C", "#B2180E"],
            grad1: "#390E1D",
            grad0: "#7C1B31",
            background_transition: materialBackground,
            yAxis_line_stroke: "#FFF",
            yAxis_line_opacity: 0.25,
            node_stroke: function (d, i) {
                return this.stroke_colors[i % 5];
            },
            node_fill: function (d, i) {
                return this.fill_colors[i % 5];
            },
            node_fill_opacity: function (d, i) {
                return .7;
            },
            class: "vz-skin-sunset"
        },
        Neon: {
            name: "Neon",
            labelColor: "#FFF",
            labelFill: "#005",
            grad0: "#000000",
            grad1: "#474747",
            background_transition: materialBackground,
            yAxis_line_stroke: "#FFF",
            yAxis_line_opacity: 0.25,
            node_stroke: function (d, i) {
                return "#FFF";
            },
            node_fill: function (d, i) {
                return "#D1F704";
            },
            node_fill_opacity: function (d, i) {
                return .6;
            },
            class: "vz-skin-neon"
        },
        Ocean: {
            name: "Ocean",
            labelColor: "#FFF",
            labelFill: "#000",
            background_transition: function (selection) {
                viz.selection().select(".vz-background").transition(1000).style("fill-opacity", 0);
            },
            yAxis_line_stroke: "#FFF",
            yAxis_line_opacity: 0.25,
            node_stroke: function (d, i) {
                return "#00F";
            },
            node_fill: function (d, i) {
                return "#FFF";
            },
            node_fill_opacity: function (d, i) {
                return .4;
            },
            class: "vz-skin-ocean"
        }
    }


    return theme;


}

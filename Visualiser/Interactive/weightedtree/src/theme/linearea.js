/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.

 This source code is covered under the following license: http://vizuly.io/commercial-license/

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// @version 1.1.54

vizuly.skin.LINEAREA_AXIIS = "Axiis";
vizuly.skin.LINEAREA_NEON = "Neon";
vizuly.skin.LINEAREA_FIRE = "Fire";
vizuly.skin.LINEAREA_OCEAN = "Ocean";
vizuly.skin.LINEAREA_SUNSET = "Sunset";
vizuly.skin.LINEAREA_BUSINESS = "Business";

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

vizuly.theme.linearea = function (viz) {


    // This is the viz we will be styling
    var viz = viz;

    // This is the holder for the active skin
    var skin = null;

    // Some meta information for the skins to use in styling
    var backgroundGradient = vizuly.svg.gradient.blend(viz, "#000", "#000");
    var businessColors = d3.scale.category20();

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
        if (!skin || skin==null) return;

        // The width and height of the viz
        var w = viz.width();
        var h = viz.height();

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

        // Style the area paths
        selection.selectAll(".vz-area")
            .style("fill", function (d, i) { return skin.area_fill(d, i); })
            .style("fill-opacity", function (d, i) { return skin.area_fill_opacity.apply(viz, [d, i]); });

        // Style the line paths
        selection.selectAll(".vz-line")
            .style("stroke-width", function () {  return h / 450 })
            .style("stroke", function (d, i) { return skin.line_stroke(d, i) })
            .style("opacity", function (d, i) { return skin.line_opacity.apply(viz, [d, i]) });

        // Hide all data points
        selection.selectAll(".vz-data-point").style("opacity", 0);

        // Update the bottom axis (dynamically adjust font size)
        selection.selectAll(".vz-bottom-axis")
            .style("font-weight", skin.xAxis_font_weight)
            .style("fill", skin.labelColor)
            .style("font-weight", 300)
            .style("fill-opacity", .8)
            .style("font-size", Math.max(8, Math.round(w / 65)) + "px")
            .style("opacity", function () { return w > 399 ? 1 : 0 });

        // Update the left axis
        selection.selectAll(".vz-left-axis line")
            .style("stroke", skin.yAxis_line_stroke)
            .style("stroke-width", 1)
            .style("opacity", skin.yAxis_line_opacity);

        // Update the left axis text (dynamically adjust font size)
        selection.selectAll(".vz-left-axis text")
            .style("font-size", Math.max(8, Math.round(w / 65)) + "px")
            .style("fill", skin.labelColor)
            .style("fill-opacity", .8);

        // Run the background transition
        skin.background_transition();
    }

    // Fires on each mouse over
    function onMouseOver(d,i,j) {

        // Animate the line to be less bright unless it is the selected one
        viz.selection().selectAll(".vz-line").transition()
            .style("stroke", function (d,i) { return skin.line_over_stroke(d,i) })
            .style("opacity", function (d,i) { return (i==j) ? 1 : 0 });

        // Anmiate the area paths to be less bright unless it is the selcted one
        viz.selection().selectAll(".vz-area").transition()
            .style("opacity", function (d,i) { return (i==j) ? 1 : .35 });

        // Remove any data tips
        viz.selection().selectAll(".vz-point-tip").remove();

        // Create a data tip circle for the appropriate data point.
        var g =  d3.select(this);
            g.append("circle")
            .attr("class","vz-point-tip").attr("r",4).style("fill","#000").style("stroke","#FFF").style("stroke-width",2).style("pointer-events","none");

    }

    // Fires on each mouse out
    function onMouseOut(d,i,j) {

        // Put all the lines back to original styling.
        viz.selection().selectAll(".vz-line").transition()
            .style("stroke", function (d, i) { return skin.line_stroke(d, i) })
            .style("opacity", function (d, i) { return skin.line_opacity.apply(viz,[d, i]) });

        // Put all areas back to full opacity
        viz.selection().selectAll(".vz-area").transition()
            .style("opacity", 1);

        // Remove any data tip circles
        viz.selection().selectAll(".vz-point-tip").remove();
    }


    // Update all axis for correct width/height on each measure event
    function onMeasure() {
        viz.yAxis().tickSize(-vizuly.core.util.size(viz.margin(), viz.width(), viz.height()).width).ticks(5).orient("left");
        viz.xAxis().tickSize(-vizuly.core.util.size(viz.margin(), viz.width(), viz.height()).width);
    }

    // Utility to transition the background
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

    var skins = {
        Fire : {
            name: "Fire",
            labelColor: "#FFF",
            color: "#02C3FF",
            stroke_colors: ["#FFA000", "#FF5722", "#F57C00", "#FF9800", "#FFEB3B"],
            fill_colors: ["#C50A0A", "#C2185B", "#F57C00", "#FF9800", "#FFEB3B"],
            grad0: "#000000",
            grad1: "#474747",
            background_transition: materialBackground,
            line_stroke: function (d, i) {
                return this.stroke_colors[i % 5];
            },
            line_over_stroke: function (d,i) {
                return d3.rgb(this.stroke_colors[i % 5]).brighter();
            },
            line_opacity: function (d, i) {
                return (this.layout() == vizuly.viz.layout.STREAM) ? .6 : .8;
            },
            area_fill: function (d, i) {
                return "url(#" + vizuly.svg.gradient.fade(viz, this.fill_colors[i % 5], "vertical", [.35, 1]).attr("id") + ")";
            },
            area_fill_opacity: function (d, i) {
                return (this.layout() == vizuly.viz.layout.OVERLAP) ? .7 : .9;
            },
            xAxis_font_weight: 200,
            yAxis_line_stroke: "#FFF",
            yAxis_line_opacity: .25,
            data_point_stroke: function (d, i) {
                return this.stroke_colors[i % 5];
            },
            data_point_fill: function (d, i) {
                return "#FFF";
            },
            class: "vz-skin-default"
        },
        Sunset: {
            name: "Sunset",
            labelColor: "#D8F433",
            color: "#02C3FF",
            stroke_colors: ["#CD57A4", "#B236A3", "#FA6F7F", "#FA7C3B", "#E96B6B"],
            fill_colors: ["#89208F", "#C02690", "#D93256", "#DB3D0C", "#B2180E"],
            grad1: "#390E1D",
            grad0: "#92203A",
            background_transition: materialBackground,
            line_stroke: function (d, i) {
                return this.stroke_colors[i % 5];
            },
            line_over_stroke: function (d,i) {
                return d3.rgb(this.stroke_colors[i % 5]).brighter();
            },
            line_opacity: function (d, i) {
                return (this.layout() == vizuly.viz.layout.STREAM) ? .4 : .9;
            },
            area_fill: function (d, i) {
                return "url(#" + vizuly.svg.gradient.fade(viz, this.fill_colors[i % 5], "vertical", [.5,1]).attr("id") + ")";
            },
            area_fill_opacity: function (d, i) {
                return (this.layout() == vizuly.viz.layout.OVERLAP) ? .8 : 1;
            },
            xAxis_font_weight: 200,
            yAxis_line_stroke: "#D8F433",
            yAxis_line_opacity: .25,
            class: "vz-skin-default"
        },
        Ocean: {
            name: "Ocean",
            labelColor: "#FFF",
            color: "#02C3FF",
            stroke_colors: ["#001432", "#001432", "#001432", "#001432", "#001432"],
            grad1: "#390E1D",
            grad0: "#92203A",
            background_transition: function (selection) {
                viz.selection().select(".vz-background").transition(1000).style("fill-opacity", 0);
            },
            line_stroke: function (d, i) {
                return "#000"
            },
            line_over_stroke: function (d,i) {
                return "#FFF"
            },
            line_opacity: function (d, i) {
                return .3;
            },
            area_fill: function (d, i) {
                return "#FFF";
            },
            area_fill_opacity: function (d, i) {
                return ((i+1)/viz.data().length) * ((this.layout() == vizuly.viz.layout.OVERLAP) ?  0.8 : 0.85);
            },
            xAxis_font_weight: 200,
            yAxis_line_stroke: "#FFF",
            yAxis_line_opacity: .25,
            class: "vz-skin-ocean"
        },
        Neon : {
            name: "Neon",
            labelColor: "#FFF",
            color: "#02C3FF",
            stroke_colors: ["#FFA000", "#FF5722", "#F57C00", "#FF9800", "#FFEB3B"],
            fill_colors: ["#C50A0A", "#C2185B", "#F57C00", "#FF9800", "#FFEB3B"],
            grad0: "#000000",
            grad1: "#474747",
            background_transition: materialBackground,
            line_stroke: function (d, i) {
                return "#FFF";
            },
            line_over_stroke: function (d,i) {
                return "#FFF";
            },
            line_opacity: function (d, i) {
                return (this.layout() == vizuly.viz.layout.STREAM) ? .4 : .6;
            },
            area_fill: function (d, i) {
                return "#D1F704";
            },
            area_fill_opacity: function (d, i) {
                return ((i+1)/this.data().length) * ((this.layout() == vizuly.viz.layout.OVERLAP) ?  0.6 : 0.8);
            },
            xAxis_font_weight: 200,
            yAxis_line_stroke: "#FFF",
            yAxis_line_opacity: .25,
            class: "vz-skin-default"
        },
        Business : {
            name: "Business",
            labelColor: "#000",
            color: "#000",
            stroke_colors: ["#FFA000", "#FF5722", "#F57C00", "#FF9800", "#FFEB3B"],
            fill_colors: ["#C50A0A", "#C2185B", "#F57C00", "#FF9800", "#FFEB3B"],
            grad0: "#CCC",
            grad1: "#EEE",
            background_transition:  materialBackground,
            line_stroke: function (d, i) {
                return d3.rgb(businessColors(i)).darker();
            },
            line_over_stroke: function (d,i) {
                return "#FFF"
                return d3.rgb(businessColors(i)).darker().darker();
            },
            line_opacity: function (d, i) {
                return .7;
            },
            area_fill: function (d, i) {
                return businessColors(i);
            },
            area_fill_opacity: function (d, i) {
                return ((this.layout() == vizuly.viz.layout.OVERLAP) ? 0.8 : 0.9);
            },
            xAxis_font_weight: 200,
            yAxis_line_stroke: "#000",
            yAxis_line_opacity: .25,
            class: "vz-skin-default"
        }
    }

    return theme;


}

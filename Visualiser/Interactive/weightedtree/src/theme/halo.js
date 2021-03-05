/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.

 This source code is covered under the following license: http://vizuly.io/commercial-license/

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// @version 1.1.54

vizuly.skin.HALO_FIRE = "Fire";
vizuly.skin.HALO_SUNSET = "Sunset";
vizuly.skin.HALO_NEON = "Neon";
vizuly.skin.HALO_OCEAN = "Ocean";

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

vizuly.theme.halo = function (viz) {

    // This is the viz we will be styling
    var viz = viz;

    // This is the holder for the active skin
    var skin = null;

    // Some meta information for the skins to use in styling
    var backgroundGradient = vizuly.svg.gradient.blend(viz, "#000", "#000");

    // Used to set stroke width for nodes
    var nodeStrokeScale=d3.scale.linear();

    // We put the callbacks in an array so we can keep track of them when we need to release the viz
    // ANY mouse out event calls the same function, which restores all of the styles and properties for the viz
    var callbacks = [
        {on: "measure.theme",callback: onMeasure},
        {on: "update.theme",callback: applyTheme},
        {on: "nodeover.theme",callback: node_onMouseOver},
        {on: "nodeout.theme",callback: onMouseOut},
        {on: "arcover.theme",callback: arc_onMouseOver},
        {on: "arcout.theme",callback: onMouseOut},
        {on: "linkover.theme",callback: link_onMouseOver},
        {on: "linkout.theme",callback: onMouseOut}
    ];

    // Create our function chained theme object
    theme();

    function theme() {
        // Bind our callbacks
        applyCallbacks();
    }

    function applyTheme() {

        // If we don't have a skin we want to exit - as there is nothing we can do.
        if (!skin || !viz) return;

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

        // Style the link paths
        selection.selectAll(".vz-halo-link-path")
            .style("fill",function (d,i) { return skin.link_fill(d,i)})
            .style("fill-opacity", skin.link_fill_opacity)
            .style("stroke",function (d,i) { return skin.link_stroke(d,i)})

        // Style the link nodes (smaller ones)
        selection.selectAll(".vz-halo-link-node")
            .style("fill",function (d,i) { return skin.link_fill(d,i)})
            .style("fill-opacity",skin.link_node_fill_opacity);

        // Style the main nodes
        selection.selectAll(".vz-halo-node")
            .style("fill",function (d,i) { return skin.node_fill(d,i)})
            .style("stroke",function (d,i) { return skin.node_stroke(d,i)})
            .style("stroke-width",function (d,i) { return nodeStrokeScale(d.r); });

        // Style the arc slices
        selection.selectAll(".vz-halo-arc-slice").style("fill",function (d,i) { return skin.arc_fill(d,i)});

        // Style the main arcs
        selection.selectAll(".vz-halo-arc").style("fill",function (d,i) { return skin.arc_fill(d,i)});

        // Run our background transition
        skin.background_transition();
    }

    // Each time the user mouses over a halo arc group this fires
    function arc_onMouseOver(e,d,i) {

        // demphasize all elements
        lowLight();

        // Highlight relevant elements associated with the halo arc group.
        highlightArc(d3.select(e));
        highlightLink(viz.selection().selectAll(".vz-halo-link-path.halo-key_" + d.data.key));
        d.data.values.forEach(function (d) {
            highlightNode(viz.selection().selectAll(".vz-halo-node.node-key_" + viz.nodeKey()(d)));
        });
    }

    // Fires each time the user mouses over a link path
    function link_onMouseOver(e,d,i) {

        // demphasize all elements
        lowLight();

        // Highlight all nodes, arcs, and arc slices associated with the links.
        highlightLink(d3.select(e.parentNode).selectAll(".vz-halo-link-path"));
        highlightArc(viz.selection().selectAll(".vz-halo-arc.halo-key_" + viz.haloKey()(d.data)));
        highlightArcSlice(d3.select(e.parentNode).selectAll(".vz-halo-arc-slice"));
        highlightNodeStroke(viz.selection().selectAll(".vz-halo-node.node-key_" + viz.nodeKey()(d.data)));
        highlightLinkNode(d3.select(e.parentNode).selectAll("circle"));
    }

    // Fires each time the user mouses over a node
    function node_onMouseOver(e,d,i) {

        // demphasize all elements
        lowLight();

        // For each link associated with the node, highlight all arc slices
        var links=viz.selection().selectAll(".vz-halo-link-path.node-key_" + d.key);
        links.each(function (d) {
           var arc=viz.selection().selectAll(".vz-halo-arc.halo-key_" + viz.haloKey()(d.data));
            highlightArc(arc);
        });

        // Highlight all links associated with the node.
        highlightLink(links);

        // Highlight all arc slices associated with the node
        highlightArcSlice(viz.selection().selectAll(".vz-halo-arc-slice.node-key_" + d.key));

        // Highlight the node itself.
        highlightLinkNode(viz.selection().selectAll(".vz-halo-node.node-key_" + d.key));
    }

    // On mouse out for ANY element we restore all elements
    function onMouseOut(e,d,i) {
        restoreElements();
    }

    // demphasizes all elements
    function lowLight() {
        viz.selection().selectAll(".vz-halo-node").style("fill-opacity",.1).style("stroke-opacity",.05);
        viz.selection().selectAll(".vz-halo-link-node").style("fill-opacity",0);
        viz.selection().selectAll(".vz-halo-link-path").style("fill-opacity",.025);
    }

    function highlightLink(selection) {
        selection.style("fill-opacity",.6).style("stroke-opacity",.25);
    }

    function highlightNodeStroke(selection) {
        selection.style("stroke-opacity",.8).style("stroke",function (d,i) { return skin.node_over_stroke(d,i)});
    }


    function highlightNode(selection) {
        selection.style("fill-opacity",.8).style("stroke-opacity",.5).style("stroke",function (d,i) { return skin.node_over_stroke(d,i)});
    }

    function highlightLinkNode(selection) {
        selection.style("fill-opacity",.5).style("stroke-opacity",.7).style("stroke",function (d,i) { return skin.node_over_stroke(d,i)});
    }

    function highlightArcSlice(selection) {
        selection.style("fill-opacity",.8).style("stroke-opacity",.8);
    }

    function highlightArc(selection) {
        selection.style("fill-opacity",.65).style("stroke-opacity",.8).style("fill",function (d,i) { return skin.arc_over_fill(d,i)});
    }

    // Restores all elements to original style settings
    function restoreElements() {
        viz.selection().selectAll(".vz-halo-arc")
            .style("fill-opacity",null)
            .style("stroke-opacity",null)
            .style("fill",function (d,i) { return skin.arc_fill(d,i)});

        viz.selection().selectAll(".vz-halo-node")
            .style("fill-opacity",null)
            .style("stroke-opacity",null)
            .style("stroke",function(d,i) { return skin.node_stroke(d,i)});

        viz.selection().selectAll(".vz-halo-link-node")
            .style("fill-opacity",skin.link_node_fill_opacity).style("stroke",null);

        viz.selection().selectAll(".vz-halo-link-path")
            .style("fill-opacity",skin.link_fill_opacity)
            .style("stroke-opacity",null);

        viz.selection().selectAll(".vz-halo-arc-slice")
            .style("fill-opacity",null)
            .style("stroke-opacity",null);
    }

    // Each time the viz is resized we need to adjust our scale for the node strokes
    function onMeasure() {
        var r=Math.min(viz.width(),viz.height()/2);
        nodeStrokeScale.domain([0,r/20]);
        nodeStrokeScale.range([0,r/80]);
    }

    // Utitliy to transition the background
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
        Fire: {
            name: "Fire",
            labelColor: "#FFF",
            labelFill: "#C50A0A",
            stroke_colors: ["#FFA000", "#FF5722", "#F57C00", "#FF9800", "#FFEB3B"],
            fill_colors: ["#C50A0A", "#C2185B", "#F57C00", "#FF9800", "#FFEB3B"],
            grad0: "#000000",
            grad1: "#474747",
            background_transition: materialBackground,
            link_stroke: function (d, i) {
                return this.stroke_colors[i % 5];
            },
            link_fill: function (d, i) {
                return this.fill_colors[i % 5];
            },
            link_fill_opacity:.1,
            link_node_fill_opacity:.1,
            node_stroke: function (d, i) {
                return this.stroke_colors[i % 5];
            },
            node_over_stroke: function (d, i) {
                return "#FFF";
            },
            node_fill: function (d, i) {
                return this.fill_colors[i % 5];
            },
            arc_stroke: function (d, i) {
                return "#FFF"
            },
            arc_fill: function (d, i) {
                return this.fill_colors[i % 5];
            },
            arc_over_fill: function (d, i) {
                return "#FFEB3B";
            },
            class: "vz-skin-fire"
        },
        Sunset: {
            name: "Sunset",
            labelColor: "#FFF",
            labelFill: "#00236C",
            stroke_colors: ["#CD57A4", "#B236A3", "#FA6F7F", "#FA7C3B", "#E96B6B"],
            fill_colors: ["#89208F", "#C02690", "#D93256", "#DB3D0C", "#B2180E"],
            grad0: "#220910",
            grad1: "#571825",
            background_transition: materialBackground,
            link_stroke: function (d, i) {
                return this.stroke_colors[i % 5];
            },
            link_fill: function (d, i) {
                return this.fill_colors[i % 5];
            },
            link_fill_opacity:.2,
            link_node_fill_opacity:.5,
            node_stroke: function (d, i) {
                return this.stroke_colors[i % 5];
            },
            node_over_stroke: function (d, i) {
                return "#FFF";
            },
            node_fill: function (d, i) {
                return this.fill_colors[i % 5];
            },
            arc_stroke: function (d, i) {
                return "#FFF"
            },
            arc_fill: function (d, i) {
                return this.fill_colors[i % 5];
            },
            arc_over_fill: function (d, i) {
                return "#00236C";
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
            link_stroke: function (d, i) {
                return "#D1F704";
            },
            link_fill: function (d, i) {
                return "#D1F704";
            },
            link_fill_opacity:.1,
            link_node_fill_opacity:.1,
            node_stroke: function (d, i) {
                return "#D1F704";
            },
            node_over_stroke: function (d, i) {
                return "#FFF";
            },
            node_fill: function (d, i) {
                return "#FFF";
            },
            arc_stroke: function (d, i) {
                return "#FFF"
            },
            arc_fill: function (d, i) {
                return "#D1F704";
            },
            arc_over_fill: function (d, i) {
                return "#03F";
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
            link_stroke: function (d, i) {
                return "#FFF";
            },
            link_fill: function (d, i) {
                return "#FFF";
            },
            link_fill_opacity:.075,
            link_node_fill_opacity:.075,
            node_stroke: function (d, i) {
                return "#FFF";
            },
            node_over_stroke: function (d, i) {
                return "#FFF";
            },
            node_fill: function (d, i) {
                return "#FFF";
            },
            arc_stroke: function (d, i) {
                return "#FFF";
            },
            arc_fill: function (d, i) {
                return "#FFF";
            },
            arc_over_fill: function (d, i) {
                return "#000";
            },
            class: "vz-skin-ocean"
        }
    }

    return theme;


}

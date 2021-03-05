//**Vizuly themes and skins** make it easy to implement subtle or significant changes to the look, feel, and responsiveness of a visual.
// Often times, little changes can make a big impact on how well a visual tells a story and communicates the underlying data.
// In this guide you will see how to make such changes with a vizuly.core.component.
//
// Before we dive into the code, let's talk about the design principle of
// <a href='https://en.wikipedia.org/wiki/Separation_of_concerns'>**separation of concerns**</a>
// In Vizuly, each component is a combination of the core component.js file (like <code> vizuly.viz.bar </code> ) and an associated theme
// file (like <code> vizuly.theme.column_bar </code>.)
//
// The core component.js is responsible for measuring, layout, adding and removing of display elements (usually svg), and implementing
// user interaction logic (mouse/touch events, zooming, panning, etc..)
// The theme file contains the logic that determines the look and feel of each element (axis lines, shapes, fonts, backgrounds, etcc), and how a given element responds to user input.
//
// Within a **theme** itself there can be one or more **skins**. A skin is a collection of style parameters, much like a CSS class.  The theme determines
// how to apply the skin to a visual, and the skin tells the theme what parameters to apply.   This allows a programmer to quickly swap out a skin
// to change such things as colors, fonts, fills, strokes, etc.., without having to worry about how to apply those changes to a component.   In all of the vizuly example files, you can see multiple
// skins implemented within a single theme.
//
// This guide we will discuss how the internals of a theme work, so you can extend them to make your own.
// For our walkthrough we will be looking at the the <code>src/theme/column_bar.js</code> theme that is used for both the vizuly bar chart and column chart.



























//First we are going to declare some namespaced constants that refer to the various skins our theme will implement.
vizuly.skin.COLUMNBAR_AXIIS = "Axiis";
vizuly.skin.COLUMNBAR_NEON = "Neon";
vizuly.skin.COLUMNBAR_MATERIALBLUE = "MaterialBlue";
vizuly.skin.COLUMNBAR_MATERIALPINK = "MaterialPink";

//Here we instantiate the theme borrowing from the same design pattern as D3.js where we use an encapsulated function chained object.
//Each theme requires a viz component (like a bar chart) at construction.  It is important to note that while a viz component has no
//dependency on a theme, the theme does require knowledge of the viz display OUTPUT (but not the internals), so it can modify them.
//
vizuly.theme.column_bar = function (viz) {



    //The first thing we do is define the skins themselves as objects.
    //Each skin shares an identical set of parameters.  Unlike CSS, which contains primarily static values,
    //the skin parameters can contain dynamic functions; which we will see applied a little later on.
    //For this theme we will create the following skins:
    //
    //*Note: vizuly themes are optimized for readability customization, NOT performance. For instance, you may want to create a mobile version of a theme that
    //is optimized for performance and doesn't use gradients and filters, which can slow down rendering.*


    var skins = {

        //**The Material Blue Skin** - A <a href='https://www.google.com/design/spec/material-design/introduction.html'>Material Design</a> inspired blue skin.

        MaterialBlue: {
            name: "Material Blue",
            labelColor: "#FFF",
            color: "#02C3FF",
            grad0: "#021F51",
            grad1: "#039FDB",
            background_transition: materialBackground,
            bar_filter: function (d, i) {
                return getDropShadow()
            },
            bar_filter_over: function (d, i) {
                return getDropShadowOver()
            },
            bar_fill: function (d, i) {
                return "#02C3FF";
            },
            bar_fill_opacity: function (d, i) {
                return (1 - ((i) / 4));
            },
            bar_mouseover_stroke: "#02C3FF",
            bar_mouseover_fill: "#FFF",
            bar_stroke_opacity: 0,
            bar_mouseover_opacity: 1,
            ordinalAxis_font_weight: 200,
            valueAxis_line_stroke: "#FFF",
            valueAxis_line_opacity: .25,
            barRadius: function () {
                return 0
            },
            datatip_class: "vz-material-datatip",
            class: "vz-skin-default"
        },

        //**The Material Pink Skin** - A <a href='https://www.google.com/design/spec/material-design/introduction.html'>Material Design</a> inspired pink skin.
        MaterialPink: {
            name: "Material Pink",
            labelColor: "#FFF",
            color: "#F553B1",
            grad0: "#540936",
            grad1: "#C12780",
            background_transition: materialBackground,
            bar_filter: function (d, i) {
                return getDropShadow()
            },
            bar_filter_over: function (d, i) {
                return getDropShadowOver()
            },
            bar_fill: function (d, i) {
                return "#FF35BE";
            },
            bar_fill_opacity: function (d, i) {
                return (1 - ((i) / 4));
            },
            bar_stroke_opacity: 0,
            bar_mouseover_stroke: "#FF35BE",
            bar_mouseover_fill: "#FFF",
            bar_mouseover_opacity: 0.9,
            ordinalAxis_font_weight: 200,
            valueAxis_line_stroke: "#FFF",
            valueAxis_line_opacity: .25,
            barRadius: function () {
                return 0
            },
            datatip_class: "vz-material-datatip",
            class: "vz-skin-default"
        },
        //**The Neon Skin** - A skin that uses primarily black and neon green, as well as rounded bars/columns.
        Neon: {
            name: "Neon",
            labelColor: "#FFF",
            color: "#D1F704",
            grad0: "#000000",
            grad1: "#474747",
            background_transition: materialBackground,
            bar_filter: function (d, i) {
                return null
            },
            bar_filter_over: function (d, i) {
                return getDropShadowOver()
            },
            bar_fill: function (d, i) {
                return "#D1F704";
            },
            bar_fill_opacity: function (d, i) {
                return (1 - ((i) / 6));
            },
            bar_stroke_opacity: 0,
            bar_mouseover_stroke: "#D1F704",
            bar_mouseover_fill: "#FFF",
            bar_mouseover_opacity: 1,
            ordinalAxis_font_weight: 200,
            valueAxis_line_stroke: "#FFF",
            valueAxis_line_opacity: .25,
            barRadius: function () {
                return viz.width() / 150;
            },
            datatip_class: "vz-neon-datatip",
            class: "vz-skin-default"
        },

        //**The Axiis Skin** - A skin reminiscent of the **<a href='http://www.axiis.org'>Axiis</a>** project.
        Axiis: {
            name: "Axiis",
            labelColor: "#444",
            color: "#000",
            colorScale: d3.scale.linear()
                .range(["#DF1133", "#3333DF"])
                .domain([0, viz.data()[0].length]),
            background_transition: function () {
                viz.selection().select(".vz-background")
                    .transition()
                    .style("fill-opacity", 0);
            },
            bar_filter: function (d, i) {
                return null;
            },
            bar_filter_over: function (d, i) {
                return null;
            },
            bar_fill: function (d, i) {
                var fade = vizuly.svg.gradient.fade(viz,
                        colorShift(this.colorScale(viz.xScale()
                        .domain().indexOf(viz.x().apply(this, [d]))), 0x224400 * i));

                return "url(#" + fade.attr("id") + ")";
            },
            bar_fill_opacity: function (d, i) {
                return (1 - ((i) / 4));
            },
            bar_mouseover_stroke: "#AAA",
            bar_mouseover_fill: "#000",
            bar_mouseover_opacity: 0.8,
            bar_stroke_opacity: 1,
            ordinalAxis_font_weight: 400,
            valueAxis_line_stroke: "#AAA",
            valueAxis_line_opacity: 1,
            barRadius: function () {
                return 0
            },
            datatip_class: "vz-axiis-datatip",
            class: "vz-skin-axiis"
        },
        //**The Minimal Theme** - Uses grey scale to create a simple graph.
        Minimal: {
            name: "Minimal",
            labelColor: "#444",
            color: "#333",
            grad0: "#F0F0F0",
            grad1: "#F0F0F0",
            background_transition: materialBackground,
            bar_filter: function (d, i) {
                return null
            },
            bar_filter_over: function (d, i) {
                return null
            },
            bar_fill: function (d, i) {
                return "#555";
            },
            bar_fill_opacity: function (d, i) {
                return (1 - ((i) / 4));
            },
            bar_stroke_opacity: 0,
            bar_mouseover_stroke: "#000",
            bar_mouseover_fill: "#333",
            bar_mouseover_opacity: 1,
            ordinalAxis_font_weight: 400,
            valueAxis_line_stroke: "#AAA",
            valueAxis_line_opacity: .35,
            barRadius: function () {
                return 0;
            },
            datatip_class: "vz-minimal-datatip",
            class: "vz-skin-default"
        }

    }

    //Here is where the **core logic of the theme starts**
    //
    // Now We declare some global variables and call our closure function <code>theme()</code>
    var viz = viz, skin = null, valueAxis, ordinalAxis, fontSize;

    var callbacks = [
        {on: "measure.theme",callback: onMeasure},
        {on: "update.theme",callback: applyTheme},
        {on: "mouseover.theme",callback: onMouseOver},
        {on: "mouseout.theme",callback: onMouseOut}
    ];

    theme();

    function theme() {

        //Once we have defined our skins and set our global variables we
        //want to capture **component specific events** so we can then modify the bar/column chart display
        //based on where it is in the render cycle.
        //*Note, we are using the <a href='https://github.com/mbostock/d3/wiki/Internals#dispatch_on'>D3 dispatch name spacing</a> so we don't overwrite any other event listeners.*
        applyCallbacks();


        //We implement a little extra logic so this theme can be re-used for both
        //bar charts and column charts by updating the respective axis.
        if (viz.type == "viz.chart.column") {
            valueAxis =  ".vz-left-axis";
            ordinalAxis = ".vz-bottom-axis";
        }
        else {
            ordinalAxis =  ".vz-left-axis";
            valueAxis = ".vz-bottom-axis";
        }

    }

    //The <code>applyTheme()</code> function is **the heart** of our theme.  This function is triggered on any
    //<code>viz.update()</code> event and is responsible for making all of the primary visual updates to the viz.
    function applyTheme() {

        //We grab a couple of temporary measurement variables.
        var w = viz.width();
        var selection = viz.selection();

        //Here we set the **font size** based on the viz size.
        fontSize = Math.max(8, Math.round(viz.width() / 65));

        //Each skin can have an associated **CSS class**, we set one here.
        selection.attr("class",_skin.class);

        //Now we update our **ordinal axis labels** with various styles.
        //*Note, at this point we are using pure D3 to make changes to the specific svg output of the viz*
        selection.selectAll(ordinalAxis + " .tick text")
            .style("font-weight", _skin.ordinalAxis_font_weight)
            .style("fill", _skin.labelColor)
            .style("fill-opacity", 1)
            .style("font-size", fontSize + "px")
            .style("opacity", function () {
                return w > 399 ? 1 : 0
            });

        //Updating our value **axis lines**.
        selection.selectAll(valueAxis + " line")
            .style("stroke", _skin.valueAxis_line_stroke)
            .style("stroke-width", 1)
            .style("opacity", _skin.valueAxis_line_opacity);

        //Updating fonts on our **value axis labels**.
        selection.selectAll(valueAxis + " text")
            .style("font-size", fontSize + "px")
            .style("fill", _skin.labelColor)
            .style("fill-opacity", .8);

        //Making sure all of our bars/columns have a white stroke, which is universal to the theme.
        var bar = selection.selectAll(".vz-plot .vz-bar")
            .style("stroke", "#FFF");

        //Based on the chart layout we make a subtle change to the **line stroke opacity** if it is a stacked chart.
        //This is where themes give you a lot of flexibility in making minor tweaks to the look and feel that can add up to big changes.
        if (viz.layout() == vizuly.viz.layout.STACKED) {
            bar.style("stroke-opacity", 1)
                .style("stroke-width", function () {
                    return (w/800) +"px";
                }).style("stroke-opacity", .6);
        } else {
            bar.style("stroke-opacity", _skin.bar_stroke_opacity);
        }

        //Here we select all the bars and apply filters and fills.  In the case of these skins
        //we are using **svg drop-shadow filters** and **linear gradients** for the fills.
        selection.selectAll(".vz-bar-group")[0].forEach(
            function (group, index) {
                d3.select(group).selectAll("rect.vz-bar")
                    .attr("filter", function (d, i) {
                        return _skin.bar_filter(d, i);
                    })
                    .style("fill-opacity", function (d, i) {
                        return _skin.bar_fill_opacity(d, i);
                    })
                    .style("fill", function (d, i) {
                        return _skin.bar_fill(d, i)
                    })
                    .style("rx",_skin.barRadius);
            });

        //This is the call that animates the background when the skin changes.
        //You probably wouldn't use this in real-life, but it is here to demonstrate what is possible and add a little
        //expressiveness to the demo examples.
        _skin.background_transition();
    }


    //Now we get to some **user triggered display changes**.
    //For the bar and column chart we want to highlight the specific bar/column and
    //the respective axis abel when a <code>mouseover</code> event occurs.
        function onMouseOver(bar, d, i) {

        //Making style and color changes to our bar for the <code>mouseover</code>.
        d3.select(bar)
            .style("fill", _skin.bar_mouseover_fill)
            .style("fill-opacity", _skin.bar_mouseover_opacity)
            .style("stroke", _skin.bar_mouseover_stroke)
            .attr("filter", _skin.bar_filter_over());

        //Finding the correct axis label and highlighting it.
        d3.select(viz.selection()
            .selectAll(ordinalAxis + " .tick text")[0][getSeriesIndex(d)])
            .transition()
            .style("font-size",(fontSize*1.2) + "px")
            .style("font-weight", 700)
            .style("fill", _skin.color)
            .style("text-decoration", "underline")
            .style("fill-opacity", 1)
            .style("opacity",1);
    }

    //On <coce>mouseout</code> we want to undo any changes we made on the <code>mouseover</code>.
    function onMouseOut(bar, d, i) {

        d3.select(bar).style("fill",
                function () { return _skin.bar_fill(d, i);})
            .style("fill-opacity",
                function () { return _skin.bar_fill_opacity(d, i); })
            .style("stroke", "#FFF")
            .attr("filter", _skin.bar_filter());

        d3.select(viz.selection()
            .selectAll(ordinalAxis + " .tick text")[0][getSeriesIndex(d)])
            .transition()
            .style("font-size",fontSize + "px")
            .style("fill", _skin.labelColor)
            .style("font-weight", _skin.ordinalAxis_font_weight)
            .style("text-decoration", null)
            .style("fill-opacity", 1)
            .style("opacity", function () {
                return viz.width() > 399 ? 1 : 0
            });

    }

    //When the component size changes, we need to do a little D3 house keeping and make sure our axis lines run the full
    //width or height of the bar/column chart.
    function onMeasure() {
        viz.selection().selectAll(".vz-tip").remove();
        if (viz.type == "viz.chart.column") {
            viz.yAxis()
                .tickSize(-vizuly.core.util.size(
                    viz.margin(),
                    viz.width(),
                    viz.height()).width)
                .ticks(5).orient("left");
        }
        else {
            viz.xAxis()
                .tickSize(-vizuly.core.util.size(
                    viz.margin(),
                    viz.width(),
                    viz.height()).height)
                .ticks(5);

        }
    }

    //Here is a quick utility function that tells us what type of medal we are displaying in the datatip
    function getSeriesIndex(val) {
        if (valueAxis =  ".vz-left-axis")
            return viz.xScale().domain().indexOf(viz.y().apply(this, [val]));
        else
            return viz.yScale().domain().indexOf(viz.x().apply(this, [val]));
    }

    //Here is a utility function that gets a drop shadow filter.
    function getDropShadow() {
        var w = viz.width();
        return "url(" + vizuly.svg.filter.dropShadow(
                viz,
                w / 300,
                w / 300,
                w / 200) + ")";
    }

    //Another function that gets a darker shadow for the mouse-over event.  See if you can see the subtle difference
    //when running the test container.
    function getDropShadowOver() {
        var w = viz.width();
        return "url(" + vizuly.svg.filter.dropShadow(
                viz,
                w / 100,
                w / 100,
                1.5) + ")";
    }

    //This is the special background gradient we will use for each skin. This gradient uses a vizuly utitily that takes
    // care of the svg gradient details for us, by creating a unique id and
    //placing it in the svg <code>defs</code> element.
    var backgroundGradient = vizuly.svg.gradient.blend(viz, "#000", "#000");

    //This function is what animates the background for the two Material Design skins.
    function materialBackground() {
        viz.selection().selectAll(".vz-background")
            .style("fill-opacity", 1);
        viz.selection().selectAll(".vz-background")
            .attr("fill", function () {
                return "url(#" +  backgroundGradient.attr("id") + ")";
        });
        backgroundGradient.selectAll("stop")
            .transition()
            .duration(500)
            .attr("stop-color", function (d, i) {
                return (i == 0) ? _skin.grad0 : _skin.grad1;
            });
    }

    function colorShift(color,value) {
        color = "0x" + color.replace("#","");
        color = (parseInt(color , 16));
        color = color + 0x010101;
        color = color | value;
        return "#" + color.toString(16);

    }

    //Here are our **public accessors**.  All vizuly classes (object closures) are built the same as then ones in D3.
    //We have public functions that set private variables and pass back a reference to object closure.
    //This allows the programmer to use the declarative function chaining syntax when programming.

    //This function is used to set a new skin and immediately apply the changes.  You could define your own custom skins outside of the theme, and as long as they
    //have the same parameters as the skins defined within the theme, they would work just as well.
    theme.apply = function (skin) {
        if (arguments.length > 0)
            theme.skin(skin);
        applyTheme();
        return theme;
    }

    function applyCallbacks() {
        callbacks.forEach(function (d) {
            viz.on(d.on, d.callback);
        });
    }

    //Removes viz from skin
    theme.release = function () {
        if (!viz) return;
        viz.selection().attr("class",null);
        callbacks.forEach(function (d) {
            viz.on(d.on, null);
        })
        viz=null;
    };

    theme.viz = function (_) {
        if (!arguments.length) {
            return viz;
        }
        viz = _;
        applyCallbacks();
    }

    //This function sets the skin theme without updating the component.
    var _skin=null;
    theme.skin = function (_) {
        if (arguments.length == 0) {
            return _skin;
        }
        if (skins[_])
            _skin = skins[_];
        else
            throw new Error("theme/column_bar.js - skin "
                + _
                + " does not exist.");

        return theme;
    }

    //This allows us to get direct access to skins and add custom ones or modify existing ones externally.
    theme.skins = function () {
        return skins;
    }

    return theme;

    //vizuly.core.components come packaged with the themes you see here, but there is no reason you can't create your own.
    //You can **make your own themes** by modifying or extending the ones you see here.
    // You can also take a more traditional and static approach to styling by using pure CSS and
    // the intrinsic object id and class names of a vizuly.core.component.
    //
    //To learn more about modifying and building your own vizuly.core.components, read our guide **<a href=''>Customizing vizuly.core.components</a>**.
}


// @version 1.1.54

// <!---
//
//  Copyright (c) 2016, BrightPoint Consulting, Inc.
//
//    This source code is covered under the following license: http://vizuly.io/commercial-license/
//
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
//    THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
//    OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
//    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// -->
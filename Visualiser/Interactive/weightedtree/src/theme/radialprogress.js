//**Vizuly themes and skins** make it easy to implement subtle or significant changes to the look, feel, and responsiveness of a visual.
// Often times, little changes can make a big impact on how well a visual tells a story and communicates the underlying data.
// In this guide you will see how to make such changes with a vizuly.core.component.
//
// Before we dive into the code, let's talk about the design principle of
// <a href='https://en.wikipedia.org/wiki/Separation_of_concerns' target='_blank'>**separation of concerns**</a>
// In Vizuly, each component is a combination of the core component.js file (like <code> vizuly.viz.bar </code> ) and an associated theme
// file (like <code> vizuly.theme.column_bar </code>.)
//
// The core component.js is responsible for measuring, layout, adding and removing of display elements (usually svg), and implementing
// user interaction logic (mouse/touch events, zooming, panning, etc..)
// The theme file contains the logic that determines the look and feel of each element (axis lines, shapes, fonts, backgrounds, etcc), and how a given element responds to user input.
//
// Within a **theme** itself there can be one or more **skins**. A skin is a collection of style parameters, much like a CSS class.  The theme determines
// **how** to the skin to a visual, and the skin tells the theme what parameters to **apply**.   This allows a programmer to quickly swap out a skin
// to change such things as colors, fonts, fills, strokes, etc.., without having to worry about how to apply those changes to a component.   In all of the vizuly example files, you can see multiple
// skins implemented within a single theme.
//
// This guide we will discuss how the internals of a theme work, so you can extend them to make your own.
// For our walkthrough we will be looking at the the <code>src/theme/radialprogress.js</code> theme that is used for both the vizuly bar chart and column chart.
//
// All themes implement the same object **life-cycle** as described below:
//
// * **instantiation** - requires a viz object so it can implement look and feel changes.
// * **applyCallBacks()** - binds callbacks to the viz events so it can apply style and property changes as the viz outputs changes.
// * **applyTheme()** - takes properties from the selected skin and applies it to the viz output.
// * **onEventXXX()** - a set of function callbacks that change output depending on the event emitted by the component.
// * **release** - unbind any callbacks, undo any display element changes, and release the viz.
//
/*































































 */

//Here we **instantiate** the theme borrowing from the same design pattern as D3.js where we use an encapsulated function chained object.
//Each theme requires a viz component at construction.  It is important to note that while a viz component has no
//dependency on a theme, the theme does require knowledge of the viz display OUTPUT (but not the internals), so it can modify them.
//
vizuly.theme.radial_progress = function (viz) {

//The first thing we do is define the skins themselves as objects.
//Each skin shares an **identical set of parameters**.  Unlike CSS, which contains primarily static values,
//the skin parameters can contain dynamic functions; which we will see applied a little later on.
//For this theme we will create the following skins:
//
//*Note: vizuly themes are optimized for readability customization, NOT performance. For instance, you may want to create a mobile version of a theme that
//is optimized for performance and doesn't use gradients and filters, which can slow down rendering.*
// Here are our custom skins
    var skins = {
        Alert : {
            name: "Alert",                          // Skin Name
            label_color: "#CCC",                    // Color of the center label
            track_fill: "#DDDDDD",                  // Color of the background 'track' of the progress bar
            progress_colors: ["#4CAF50", "#FFC107", "#FF9800", "#E64A19", "#FFEB3B"],       // Colors used for progress bar
            arc_fill: function (d, i) {
                return this.progress_colors[i % 5]; // Dynamic function that returns a fill based on the index value
            },
            arc_fill_opacity: function (d,i) {
                return 1;                           // Dynamic function that returns opacity (in this case it is 1, but the WHITE skin uses a dynamic opacity
            },
            arc_stroke: function (d, i) {
                return this.progress_colors[i % 5]; // Dynamic function that returns stroke color based on index
            },
            // Each skin can also have a **CSS class** with styles that don't need to be changed dynamically by the theme directly.
            class: "vz-skin-alert"                  // CSS Class that it will apply to the viz object output.
        },
        Fire: {
            name: "Fire",
            label_color: "#F13870",
            track_fill: "#DDDDDD",
            progress_colors: ["#C50A0A", "#F57C00", "#FF9800", "#FFEB3B", "#C2185B"],
            arc_fill: function (d, i) {
                return this.progress_colors[i % 5];
            },
            arc_fill_opacity: function (d,i) {
                return 1;
            },
            arc_stroke: function (d, i) {
                return this.progress_colors[i % 5];
            },
            class: "vz-skin-fire"
        },
        White: {
            name: "White",
            label_color: "#FFF",
            track_fill: null,
            arc_fill: function (d, i) {
                return "#FFF";
            },
            arc_fill_opacity: function (d,i) {
                return .85/Math.exp(i*.75);
            },
            arc_stroke: function (d, i) {
                return "#FFF";
            },
            class: "vz-skin-white"
        },
        Neon: {
            name: "Neon",
            label_color: "#D1F704",
            track_fill: "#000",
            progress_colors: ["#D1F704", "#A8C102", "#788A04", "#566204", "#383F04"],
            arc_fill: function (d,i) {
                return this.progress_colors[i % 5];
            },
            arc_fill_opacity: function (d,i) {
                return 1;
            },
            arc_stroke: function (d, i) {
                return this.progress_colors[i % 5];
            },
            class: "vz-skin-neon"
        },
        Business: {
            name: "Business",
            label_color: "#EEE",
            track_fill: "#DDDDDD",
            progress_colors: d3.scale.category20(),
            arc_fill: function (d,i) {
                return this.progress_colors(i);
            },
            arc_fill_opacity: function (d,i) {
                return 1;
            },
            arc_stroke: function (d, i) {
                return this.progress_colors(i);
            },
            class: "vz-skin-business"
        }
    }


    // This is the **viz** we will be styling.
    var viz = viz;

    // We put the **callbacks** in an array so we can keep track of them when we need to release the viz.
    var callbacks = [
        {on: "update.theme",callback: applyTheme},
        {on: "mouseover.theme",callback: onMouseOver},
        {on: "mouseout.theme",callback: onMouseOut}
    ];

    // Now we create our function chained **theme** object that will wrap a closure around its functions.
    theme();

    // The only thing we need to do at this point is bind our callbacks to the viz object.
    function theme() {
        applyCallbacks();
    }

    //The <code>applyTheme()</code> function is **the heart** of our theme.  This function is triggered on any
    //<code>viz.update()</code> event and is responsible for making all of the primary visual updates to the viz.
    function applyTheme() {

        // If we don't have a skin, we want to exit - as there is nothing we can do.
        if (!skin) return;

        // Grab the d3 **selection** from the viz so we can operate on it.
        var selection = viz.selection();

        // Set our skin **css** class
        selection.attr("class",skin.class);

        // Style our **progress** arcs
        selection.selectAll(".vz-radial_progress-arc")
            .style("fill",function (d,i) { return skin.arc_fill(d,i)})
            .style("fill-opacity",function (d,i) { return skin.arc_fill_opacity(d,i)})
            .style("stroke",function (d,i) { return skin.arc_stroke(d,i)});

        // Style the **track** arcs
        selection.selectAll(".vz-radial_progress-track")
            .style("fill",skin.track_fill);

        // Style the **label**
        selection.selectAll(".vz-radial_progress-label")
            .style("fill",skin.label_color)
            .style("stroke-opacity",0)
            .style("font-size",viz.radius() *.25);  // Notice we dynamically size the font based on the gauge radius.

    }

    //Now we get to some user triggered display changes.
    //For the gauge we simply change the font-weight of the label when a **mouseover** event occurs.
    function onMouseOver(e,d,i) {
        viz.selection().selectAll(".vz-radial_progress-label")
            .style("font-weight",700);
    }

    //On **mouseout** we want to undo any changes we made on the mouseover callback.
    function onMouseOut(e,d,i) {
        viz.selection().selectAll(".vz-radial_progress-label")
            .style("font-weight",null);
    }

    // This function **binds** all of our theme **callbacks** to the viz so the theme can respond to events as needed.
    function applyCallbacks() {
        callbacks.forEach(function (d) {
            viz.on(d.on, d.callback);
        });
    }

    // This function **removes** all of our theme **callbacks** from the viz to free up any event listeners.
    function removeCallbacks() {
        callbacks.forEach(function (d) {
            viz.on(d.on, null);
        })
    }

    //-------------------------------------------------------
    //
    // Here are our **public accessors**.  All vizuly classes (function closures) are built the same as the ones in D3.
    // We have public functions that set private variables and pass back a reference a function closure.
    // This allows the programmer to use the declarative function chain syntax when programming.
    //
    //---------------------------------------------------------

    //This function is used to set a **new skin** and immediately apply the changes.  You could define your own custom skins outside of the theme, and as long as they
    //have the same parameters as the skins defined within the theme, they would work just as well.
    theme.apply = function (skin) {
        if (arguments.length > 0)
            theme.skin(skin);
        applyTheme();
        return theme;
    }

    // This **removes**  the viz from skin and any associated event listeners.
    theme.release = function () {
        if (!viz) return;
        viz.selection().attr("class",null);
        removeCallbacks();
        viz=null;
    };

    // Here we can either manually set a new viz object or **grab a reference** to the current one.
    theme.viz = function (_) {
        if (!arguments.length) {
            return viz;
        }
        if (viz) {
            removeCallbacks();
        }
        viz = _;
        applyCallbacks();
    }

    // Sets the **skin** for the theme
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

    // Returns **all of the skins**
    theme.skins = function () {
        return skins;
    }


    // This is the holder for the active skin
    var skin = skins[vizuly.skin.RADIAL_PROGRESS_BUSINESS];

    return theme;

}

// We keep our skins declared as **constants** so we can easily reference them in other functions
vizuly.skin.RADIAL_PROGRESS_FIRE = "Fire";
vizuly.skin.RADIAL_PROGRESS_MATERIAL = "Material";
vizuly.skin.RADIAL_PROGRESS_NEON = "Neon";
vizuly.skin.RADIAL_PROGRESS_OCEAN = "Ocean";
vizuly.skin.RADIAL_PROGRESS_ALERT = "Alert";
vizuly.skin.RADIAL_PROGRESS_BUSINESS = "Business";


// And that is pretty much it.  This is a pretty simple theme, some of the other vizuly.core.components implement more
// sophisticated themes.

//
//
// <code> @version 1.1.54 </code>

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


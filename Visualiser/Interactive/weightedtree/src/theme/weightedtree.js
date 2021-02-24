
//Here we **instantiate** the theme borrowing from the same design pattern as D3.js where we use an encapsulated function chained object.
//Each theme requires a viz component at construction.  It is important to note that while a viz component has no
//dependency on a theme, the theme does require knowledge of the viz display OUTPUT (but not the internals), so it can modify them.
//
vizuly.theme.weighted_tree = function (viz) {


    var skins = {
        "Axiis" : {
            name: "Axiis",                          // Skin Name
            label_color: "#333",                    // Color of the center label
            link_colors: ["#bd0026", "#fecc5c", "#fd8d3c", "#f03b20", "#B02D5D",
                "#9B2C67", "#982B9A", "#692DA7", "#5725AA", "#4823AF",
                "#d7b5d8", "#dd1c77", "#5A0C7A", "#5A0C7A"],
            link_stroke: function (d, i) {
                return d.target.vz_link_color;
            },
            link_stroke_opacity: function (d,i) {
                if (viz.value()(d.target) <= 0 ) return .15;
                return .35;                           // Dynamic function that returns opacity (in this case it is 1, but the WHITE skin uses a dynamic opacity
            },
            node_fill: function (d, i) {
                return d.vz_link_color;
            },
            node_fill_opacity: function (d, i) {
                if (viz.value()(d) <= 0 ) return .15;
                return .4;
            },
            node_stroke: function (d, i) {
                return d.vz_link_color;
            },
            node_stroke_opacity: function (d, i) {
                return .6;
            },
            text_fill_opacity: function (d,i) {
                if (viz.value()(d) <= 0 ) return .35;
                return 1;
            },
            font_size: function () { return fontSize + "px"; }
        },
        "None" : {
            name: "None",                          // Skin Name
            label_color: null,                    // Color of the center label
            link_colors: ["#bd0026", "#fecc5c", "#fd8d3c", "#f03b20", "#B02D5D",
                "#9B2C67", "#982B9A", "#692DA7", "#5725AA", "#4823AF",
                "#d7b5d8", "#dd1c77", "#5A0C7A", "#5A0C7A"],
            link_stroke: function (d, i) {
                return null;
            },
            link_stroke_opacity: function (d,i) {
                return null;
            },
            node_fill: function (d, i) {
                return null;
            },
            node_fill_opacity: function (d, i) {
                return null;
            },
            node_stroke: function (d, i) {
                return null;
            },
            node_stroke_opacity: function (d, i) {
                return null;
            },
            text_fill_opacity: function (d,i) {
                return null;
            },
            font_size: function() { return null; }
        }
    }

    // This is the **viz** we will be styling.
    var viz = viz;
    var fontSize;
    var skinDirty = true;
    var dataDirty = true;

    // We put the **callbacks** in an array so we can keep track of them when we need to release the viz.
    var callbacks = [
        {on: "update.theme",callback: applyTheme},
        {on: "data_prepped.theme",callback: prepColorData},
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

        fontSize = Math.max(8, Math.round(viz.width() / 75));


        selection.selectAll(".vz-weighted_tree-node circle")
            .style("stroke",function (d) { return skin.node_stroke(d) })
            .style("stroke-opacity",function (d) { return skin.node_stroke_opacity(d) })
            .style("fill",function (d) { return skin.node_fill(d) })
            .style("fill-opacity", function (d) { return skin.node_fill_opacity(d)});

        selection.selectAll(".vz-weighted_tree-node text")
            .style("font-size",skin.font_size())
            .style("fill",skin.label_color)
            .style("fill-opacity",function (d) { return skin.text_fill_opacity(d)});

        selection.selectAll(".vz-weighted_tree-link")
            .style("stroke",function (d) { return skin.link_stroke(d) })
            .style("stroke-opacity", function (d) { return skin.link_stroke_opacity(d)});


    }

    function prepColorData() {

        if (!skin || !viz.data()) return;

        var nodes = viz.data();

        viz.children()(nodes).forEach(function (node,i) {

            node.vz_link_color = skin.link_colors[i % skin.link_colors.length];
            setLinkColor(node);

        });

        skinDirty=false;
        dataDirty=false;
    }

    function setLinkColor(node) {
        if (!viz.children()(node)) return;
        viz.children()(node).forEach(function (child) {
            child.vz_link_color = node.vz_link_color;
            setLinkColor(child);
        })
    }


    //Now we get to some user triggered display changes.
    //For the gauge we simply change the font-weight of the label when a **mouseover** event occurs.
    function onMouseOver(e,d,i) {
        var selection = viz.selection();
        selection.selectAll(".vz-id-" + d.vz_tree_id + " circle").style("fill-opacity",.9);
        selection.selectAll("path.vz-id-" + d.vz_tree_id).style("stroke-opacity",.8);
        selection.selectAll(".vz-id-" + d.vz_tree_id + " text").transition().style("font-size",fontSize*1.25).style("font-weight","bold");
    }

    //On **mouseout** we want to undo any changes we made on the mouseover callback.
    function onMouseOut(e,d,i) {

        var selection = viz.selection();

        selection.selectAll(".vz-weighted_tree-node circle")
            .style("fill",function (d) { return skin.node_fill(d) })
            .style("fill-opacity", function (d) { return skin.node_fill_opacity(d)})

        selection.selectAll(".vz-weighted_tree-node text").transition().style("font-size",fontSize).style("font-weight","normal");

        selection.selectAll(".vz-weighted_tree-link")
            .style("stroke-opacity",function (d) { return skin.link_stroke_opacity(d) })
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
        skin=skins["None"];
        applyTheme();
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
        if (skins[_]) {
            skinDirty=true;
            skin = skins[_];
        }
        else
            throw new Error("theme/weightedtree.js - skin " + _ + " does not exist.");

        return theme;
    }

    // Returns **all of the skins**
    theme.skins = function () {
        return skins;
    }


    // This is the holder for the active skin
    var skin = skins[vizuly.skin.WEIGHTED_TREE_AXIIS];

    return theme;

}

// We keep our skins declared as **constants** so we can easily reference them in other functions
vizuly.skin.WEIGHTED_TREE_AXIIS = "Axiis";


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



vizuly.theme.range_input = function (viz) {


    var skins = {
        Default : {
            name: "Default",                          // Skin Name
            label_color: "#CCC",                    // Color of the center label
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

        selection.selectAll(".vz-range_input-handle").style("cursor","pointer");
        selection.selectAll(".vz-range_input-centerpane").style("cursor","pointer");
        selection.selectAll(".vz-range_input-track").style("opacity",0);

    }

    //Now we get to some user triggered display changes.
    //For the gauge we simply change the font-weight of the label when a **mouseover** event occurs.
    function onMouseOver(e,d,i) {

    }

    //On **mouseout** we want to undo any changes we made on the mouseover callback.
    function onMouseOut(e,d,i) {

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
    var skin = skins.Default;

    return theme;

}


/*
 Starting point for a vizuly.core.component
 */
vizuly.ui.range_input = function (parent) {

    // This is the object that provides pseudo "protected" properties that the vizuly.viz function helps create
    var scope={};

    var properties = {
        "data" : [.25,.75],         // Expects a array of two values assumes data[0] is less than data[1]
        "margin" : {                // Our marign object
            "top": "10%",           // Top margin
            "bottom" : "7%",        // Bottom margin
            "left" : "8%",          // Left margin
            "right" : "7%"          // Right margin
        },
        "domain": [0,1],
        "duration": 500,            // This the time in ms used for any component generated transitions
        "width": 300,               // Overall width of component
        "height": 300,              // Height of component
        "handleWidth": 3,           // With of Handle
        "trackHeight": .1           // Percentage
    };

    //Create our viz and type it
    var viz=vizuly.core.component(parent,scope,properties,["change","handleOver","handleOut"]);
    viz.type="viz.ui.range_input";

    //Measurements
    var size;                   // Holds the 'size' variable as defined in viz.util.size()

    //These are all d3.selection objects we use to insert and update svg elements into
    var svg, defs, background, g, plot, leftHandle, rightHandle, leftPane, centerPane, rightPane, track;

    var xScale = d3.scale.linear();
    var trackHeight;
    var handleWidth;
    var leftDrag = d3.behavior.drag(), rightDrag = d3.behavior.drag(), centerDrag = d3.behavior.drag();

    leftDrag.on("drag",onLeftDrag);
    rightDrag.on("drag",onRightDrag);
    centerDrag.on("drag",onCenterDrag);

    initialize();

    // Here we set up all of our svg layout elements using a 'vz-XX' class namespace.  This routine is only called once
    // These are all place holder groups for the invidual data driven display elements.   We use these to do general
    // sizing and margin layout.  The all are referenced as D3 selections.
    function initialize() {

        svg = scope.selection.append("svg").attr("id", scope.id).style("overflow","visible").attr("class","vizuly");
        defs = vizuly.core.util.getDefs(viz);
        background = svg.append("rect").attr("class","vz-background");
        g = svg.append("g").attr("class","vz-range_input");
        plot = g.append("g").attr("class","vz-plot")
        track = plot.append("rect").attr("class",'vz-range_input-track');
        leftPane = plot.append("rect").attr("class",'vz-range_input-sidepane');
        centerPane = plot.append("rect").attr("class",'vz-range_input-centerpane');
        rightPane = plot.append("rect").attr("class",'vz-range_input-sidepane');
        leftHandle = plot.append("rect").attr("class",'vz-range_input-handle');
        rightHandle = plot.append("rect").attr("class",'vz-range_input-handle');

        leftHandle.call(leftDrag);
        rightHandle.call(rightDrag);
        centerPane.call(centerDrag);


        // Tell everyone we are done initializing
        scope.dispatch.initialize();
    }

    // The measure function performs any measurement or layout calcuations prior to making any updates to the SVG elements
    function measure() {

        // Call our validate routine and make sure all component properties have been set
        viz.validate();

        // Get our size based on height, width, and margin
        size = vizuly.core.util.size(scope.margin, scope.width, scope.height);

        xScale.range([0,size.width]);
        xScale.domain(scope.domain);

        trackHeight = Math.round(size.height * scope.trackHeight);

        handleWidth = scope.handleWidth;

        // Tell everyone we are done making our measurements
        scope.dispatch.measure();

    }

    // The update function is the primary function that is called when we want to render the visualiation based on
    // all of its set properties.  A developer can change properties of the components and it will not show on the screen
    // until the update function is called
    function update() {

        // Call measure each time before we update to make sure all our our layout properties are set correctly
        measure();

        // Layout all of our primary SVG d3 elements.
        svg.attr("width", scope.width).attr("height", scope.height);
        background.attr("width", scope.width).attr("height", scope.height);
        plot.style("width",size.width).style("height",size.height).attr("transform","translate(" + size.left + "," + size.top +  ")");

        track.attr("width",size.width).attr("height",trackHeight).attr("y", (size.height-trackHeight)/2);
        leftHandle.attr("width",handleWidth).attr("height",size.height).attr("x",xScale(scope.data[0]));
        rightHandle.attr("width",handleWidth).attr("height",size.height).attr("x",xScale(scope.data[1]));
        leftPane.attr("width",xScale(scope.data[0])).attr("height",size.height);
        rightPane.attr("width",size.width-xScale(scope.data[1])).attr("height",size.height).attr("x",xScale(scope.data[1]));
        centerPane.attr("width",xScale(scope.data[1])-xScale(scope.data[0])).attr("height",size.height).attr("x",xScale(scope.data[0]));

        // Let everyone know we are doing doing our update
        // Typically themes will attach a callback to this event so they can apply styles to the elements
        scope.dispatch.update();
    }

    function onLeftDrag() {
        var newValue =  xScale.invert(d3.event.x);
        newValue = Math.min(scope.data[1]-xScale.invert(handleWidth),Math.max(newValue,scope.domain[0]));
        scope.data[0] = newValue;
        scope.dispatch.change(viz);
        update();
    }

    function onRightDrag() {
        var newValue =  xScale.invert(d3.event.x);
        newValue = Math.max(scope.data[0]+xScale.invert(handleWidth),Math.min(newValue,scope.domain[1]));
        scope.data[1] = newValue;
        scope.dispatch.change(viz);
        update();
    }

    function onCenterDrag() {
        var newValue =  xScale.invert(d3.event.dx) + scope.data[0];
        newValue = Math.min(scope.data[1],Math.max(newValue,scope.domain[0]));
        var diff = scope.data[1]-scope.data[0];
        newValue = Math.min(scope.domain[1]-diff,newValue);
        scope.data[0]  = newValue;
        scope.data[1] = newValue + diff;
        scope.dispatch.change(viz);
        update();
    }

    // This is our public update call that all viz components implement
    viz.update = function () {
        update();
        return viz;
    };

    // Returns our glorious viz component :)
    return viz;

};
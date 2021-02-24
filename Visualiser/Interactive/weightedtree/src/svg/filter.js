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
vizuly.svg.filter={};

/**
 * This function creates a drop shadow filter by appending it to the SVG *def* element of the vizuly component.
 * It returns the id of this element to be referenced by specific SVG geometries.   If a previous drop shadow with the same parameters has already been
 * created, it will return a reference to the previously created drop shadow.
 *  @function
 *  @param {vizuly.component} viz - The vizuly component
 *  @param {Number} dx - the distance along the x axis for the drop shadow offset.
 *  @param {Number} dy - the distance along the y axis for the drop shadow offset.
 *  @param {Number} blur - the blur amount as a SVG standard deviation.
 *  @returns {String} - The id of the filter to be referenced.
 */
vizuly.svg.filter.dropShadow = function (viz,dx,dy,blur) {

    var f = Math.round(dx*100) + "_" + Math.round(dy*100) + "_" + Math.round(dev*100);
    var id = viz.id();

    var defs=vizuly.core.util.getDefs(viz);

    var filter = defs.selectAll("#vz_filter_" + id + "_" + f).data([f]).enter()
        .append("filter")
        .attr("id", "vz_filter_" + id + "_" + f )
        .attr("class","vz-svg-filter-dropShadow")
        .attr("width","300%")
        .attr("height","300%");


    filter.append("feGaussianBlur").attr("in","SourceAlpha").attr("stdDeviation",blur);
    filter.append("feOffset").attr("dx",dx).attr("dy",dy);
    filter.append("feComponentTransfer").append("feFuncA").attr("type","linear").attr("slope",0.2);
    var merge = filter.append("feMerge");
        merge.append("feMergeNode");
        merge.append("feMergeNode").attr("in","SourceGraphic");

    return ("#vz_filter_" + id + "_" + f );
};
function() {
   this.labels = '0 1 2 3 4 5 6 7 8 9'.split(' ');

   this.render = function() {
      this.duringSketch(function() {
         var curves = CT.lineFont[0][16 + this.selection];
	 for (var i = 0 ; i < curves.length ; i++)
            mCurve(curves[i]);
      });
      this.afterSketch(function() {
         if (this.sketchTexts.length == 0)
            this.setSketchText(0, '' + this.selection, [0,-.1], 1.5);
      });
   }

   this.output = function() { return this.sketchTexts[0].value; }
}

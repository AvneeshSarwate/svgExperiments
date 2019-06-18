var slider1 = 0, slider2 = 0;
// Enable WebMidi.js
WebMidi.enable(function (err) {

    if (err) {
      console.log("WebMidi could not be enabled.", err);
    }
    // Retrieve an input by name, id or index
    var input = WebMidi.getInputByName("from Max 1");

    // Listen for a 'note on' message on all channels
    input.addListener('controlchange', "all",
    function (e) {
        console.log("Received 'control' message: ", e);
    }
    );
});
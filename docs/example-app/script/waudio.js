
function AudioFX () {

    var _audio = {
        context : undefined,
        nodes : {
            input : undefined,
            speech : {
                lowShelf: undefined,
                highShelf: undefined,
                peaking : undefined,
                compressor : undefined
            },
            bassBoost : undefined,
            reverb : undefined,
            reverbMixer : undefined,
            dryMixer : undefined
        }
    }


    function setOnElement (mediaElement) {

        console.log('Setting Audio FX on a given media element');

        // Setup context
        _audio.context = new AudioContext() || WebKit.AudioContext();

        // Create nodes
        _audio.nodes.input = _audio.context.createMediaElementSource(mediaElement);
        _audio.nodes.reverb = _audio.context.createConvolver();
        _audio.nodes.reverbMixer = _audio.context.createGain();
        _audio.nodes.dryMixer = _audio.context.createGain();
        _audio.nodes.speech.lowShelf = _audio.context.createBiquadFilter();
        _audio.nodes.speech.highShelf = _audio.context.createBiquadFilter();
        _audio.nodes.speech.peaking = _audio.context.createBiquadFilter();
        _audio.nodes.speech.compressor = _audio.context.createDynamicsCompressor();
        _audio.nodes.bassBoost = _audio.context.createBiquadFilter();

        /* Setup all the individual node parameters */
        
        // Filters
        setBiquadParams(_audio.nodes.speech.lowShelf, 0, 600, 0.7, 'lowshelf');
        setBiquadParams(_audio.nodes.speech.highShelf, 0, 2000, 0.7, 'highshelf');
        setBiquadParams(_audio.nodes.speech.peaking, 0, 1000, 0.7, 'peaking');
        setBiquadParams(_audio.nodes.bassBoost, 0, 500, 0.7, 'lowshelf');

        // Request the convolver buffer and setup graph on load
        setConvolverBuffer('example-app/res/audio/ir.mp3');

    }

    function setBiquadParams (biquadNode, gain, freq=undefined, Q=undefined, type=undefined) {
        biquadNode.gain.setValueAtTime(gain, _audio.context.currentTime);
        if(freq !== undefined) {
            biquadNode.frequency.setValueAtTime(freq, _audio.context.currentTime);
        }
        if(Q !== undefined) {
            biquadNode.Q.setValueAtTime(Q, _audio.context.currentTime);
        }
        if(type !== undefined) {
            biquadNode.type = type;
        }
    }

    function setReverbWetLevel (level) {
        _audio.nodes.reverbMixer.gain.setValueAtTime(level, _audio.context.currentTime);
        _audio.nodes.dryMixer.gain.setValueAtTime(1 - level, _audio.context.currentTime);
    }

    function setConvolverBuffer (url) {

        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';

        request.onload = function () {

            var audioData = request.response;

            _audio.context.decodeAudioData(audioData, function (buffer) {

                // Setup convolve buffer
                _audio.nodes.reverb.buffer = buffer;

                // Connect all nodes
                connectGraph();

                setReverbWetLevel(0.98);

                console.log('All setup!');

            },

            (e) => { 
                console.error('Error with decoding audio data' + e.err); 
            }); 
        }

        request.send();
        
    }

    function connectGraph () {

        // Setup reverb processing on graph
        _audio.nodes.input.connect(_audio.nodes.reverb);
        _audio.nodes.reverb.connect(_audio.nodes.reverbMixer);
        _audio.nodes.reverbMixer.connect(_audio.context.destination);

        // Setup dry processing on graph
        _audio.nodes.input.connect(_audio.nodes.speech.compressor);
        _audio.nodes.speech.compressor.connect(_audio.nodes.speech.lowShelf);
        _audio.nodes.speech.lowShelf.connect(_audio.nodes.speech.highShelf);
        _audio.nodes.speech.highShelf.connect(_audio.nodes.speech.peaking);
        _audio.nodes.speech.peaking.connect(_audio.nodes.dryMixer);
        _audio.nodes.dryMixer.connect(_audio.context.destination);

    }

    return({
        setOnElement: setOnElement
    })
}

var WebAudioFx = AudioFX();